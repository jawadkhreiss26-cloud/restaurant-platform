import { prisma } from "../db";
import { getMetaAdapter } from "../adapters/meta";
import { runAgentTurn, PROMPT_VERSION } from "../ai-agent/turn";
import { containsOptOutPhrase } from "../ai-agent/guardrails";
import { getSettings } from "../settings";
import { getPaymentsAdapter } from "../adapters/payments";
import { DEFAULT_PRICING } from "../core/pricing";
import { logAudit } from "../audit";
import { transition, type LeadStage } from "./crm";

async function moveLeadStage(leadId: string, currentStage: string, toStage: LeadStage, actor: "ai" | "human" | "system", reason?: string) {
  const result = transition(currentStage as LeadStage, toStage, actor, { reason });
  if (!result.allowed) return false;
  await prisma.lead.update({ where: { id: leadId }, data: { status: toStage } });
  await prisma.crmTransition.create({ data: { leadId, fromStage: currentStage, toStage, actor, reason } });
  return true;
}

/**
 * Orchestrates one inbound-message -> AI-turn -> outbound-message cycle.
 * In production this body runs inside the queue worker (see
 * worker/index.ts); it is invoked directly here for the MVP so the whole
 * flow is demoable without standing up a separate Redis/BullMQ process.
 */
export async function processInboundMessage(conversationId: string, text: string) {
  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: { lead: true, messages: { orderBy: { createdAt: "asc" } } }
  });

  await prisma.message.create({
    data: { conversationId, direction: "inbound", text, deliveryStatus: "delivered" }
  });

  const optOut = containsOptOutPhrase(text);

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastCustomerMessageAt: new Date(),
      messagingWindowExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      replyEligible: true,
      optOut: optOut || conversation.optOut
    }
  });

  if (optOut) {
    await prisma.lead.update({ where: { id: conversation.leadId }, data: { status: "OPTED_OUT", optedOut: true } });
    await prisma.optOut.create({ data: { leadId: conversation.leadId, identifier: conversation.recipientId ?? "unknown" } });
    await prisma.crmTransition.create({
      data: { leadId: conversation.leadId, fromStage: conversation.lead.status, toStage: "OPTED_OUT", actor: "system", reason: "opt-out phrase detected" }
    });
    return { skipped: true, reason: "opt_out" };
  }

  const settings = await getSettings();

  if (conversation.aiPaused || conversation.humanTakeover || settings.globalAiPause || settings.emergencyStop) {
    return { skipped: true, reason: "ai_paused_or_human_takeover_or_global_pause" };
  }

  const preview = await prisma.websitePreview.findUnique({ where: { leadId: conversation.leadId } });
  const verifiedFields = await prisma.leadField.findMany({
    where: { leadId: conversation.leadId, verificationStatus: "verified" }
  });

  const priorObjection = await prisma.aiInteraction.findFirst({
    where: { leadId: conversation.leadId, outputJson: { contains: '"detectedObjection"' } }
  });

  const { action, violations, raw, usedMock } = await runAgentTurn(
    {
      companyName: settings.companyName,
      aiAssistantName: settings.aiAssistantName,
      restaurantName: conversation.lead.restaurantName,
      city: conversation.lead.city,
      governorate: conversation.lead.governorate,
      cuisineType: conversation.lead.cuisineType,
      currentStage: conversation.stage,
      standardPriceUsd: DEFAULT_PRICING.standardPriceUsdCents / 100,
      discountTier1Usd: DEFAULT_PRICING.discountTier1UsdCents / 100,
      discountFloorUsd: DEFAULT_PRICING.discountFloorUsdCents / 100,
      hostingIncludedMonths: DEFAULT_PRICING.hostingIncludedMonths,
      hostingRenewalMonthlyUsd: DEFAULT_PRICING.hostingRenewalMonthlyUsdCents / 100,
      previewUrl: preview ? `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/p/${preview.slug}` : null,
      verifiedFacts: verifiedFields.map((f) => ({ fieldName: f.fieldName, value: f.value })),
      conversationHistory: conversation.messages.map((m) => ({
        direction: m.direction as "inbound" | "outbound",
        text: m.text
      })),
      latestCustomerMessage: text
    },
    {
      hasPaymentPermission: conversation.stage === "PAYMENT_PERMISSION" || conversation.stage === "PAYMENT_SENT",
      objectionRaisedThisLead: Boolean(priorObjection),
      confidenceThreshold: settings.aiConfidenceThreshold
    }
  );

  await prisma.aiInteraction.create({
    data: {
      leadId: conversation.leadId,
      conversationId,
      promptVersion: PROMPT_VERSION,
      provider: usedMock ? "mock" : "anthropic",
      model: usedMock ? "mock" : process.env.AI_MODEL || "claude-sonnet-4-5",
      stage: conversation.stage,
      inputSummary: text.slice(0, 500),
      outputJson: JSON.stringify(action),
      confidence: action.confidence,
      toolsUsed: JSON.stringify(action.toolCalls.map((t) => t.tool)),
      approvalStatus: action.escalate ? "escalated" : "auto"
    }
  });

  if (action.escalate) {
    await prisma.conversation.update({ where: { id: conversationId }, data: { aiPaused: true } });
    await prisma.lead.update({ where: { id: conversation.leadId }, data: { status: "ESCALATED" } });
    await prisma.crmTransition.create({
      data: {
        leadId: conversation.leadId,
        fromStage: conversation.lead.status,
        toStage: "ESCALATED",
        actor: "ai",
        reason: action.escalate.reason
      }
    });
    // A short, honest holding message — never fabricated content.
    const holding = "شكراً على رسالتك، راح يتواصل وياك أحد فريقنا حالاً لمتابعة طلبك.";
    const meta = getMetaAdapter();
    const sendResult = await meta.sendMessage({
      platform: conversation.platform,
      recipientId: conversation.recipientId ?? "",
      text: holding
    });
    await prisma.message.create({
      data: {
        conversationId,
        direction: "outbound",
        text: holding,
        aiGenerated: true,
        aiConfidence: action.confidence,
        platformMessageId: sendResult.platformMessageId,
        deliveryStatus: sendResult.status
      }
    });
    return { escalated: true, violations };
  }

  if (action.reply) {
    const meta = getMetaAdapter();
    const sendResult = await meta.sendMessage({
      platform: conversation.platform,
      recipientId: conversation.recipientId ?? "",
      text: action.reply
    });
    await prisma.message.create({
      data: {
        conversationId,
        direction: "outbound",
        text: action.reply,
        aiGenerated: true,
        aiConfidence: action.confidence,
        platformMessageId: sendResult.platformMessageId,
        deliveryStatus: sendResult.status
      }
    });
  }

  await prisma.conversation.update({ where: { id: conversationId }, data: { stage: action.nextStage } });

  // Handle tool calls that have side effects.
  for (const call of action.toolCalls) {
    if (call.tool === "create_payment_link") {
      const payments = getPaymentsAdapter();
      const amount = action.discountOffered ?? DEFAULT_PRICING.standardPriceUsdCents;
      const link = await payments.createPaymentLink({
        leadId: conversation.leadId,
        amountUsdCents: amount,
        purpose: "setup",
        idempotencyKey: `${conversation.leadId}-setup-${Date.now()}`
      });
      await prisma.paymentLink.create({
        data: {
          leadId: conversation.leadId,
          amountUsdCents: amount,
          url: link.url,
          externalRef: link.externalRef,
          status: "LINK_SENT",
          expiresAt: link.expiresAt
        }
      });
      const freshLead = await prisma.lead.findUniqueOrThrow({ where: { id: conversation.leadId } });
      await moveLeadStage(conversation.leadId, freshLead.status, "PAYMENT_LINK_SENT", "ai", "payment link created by AI turn");
    }
  }

  await logAudit({
    actorType: "ai",
    action: "ai.turn",
    entityType: "Conversation",
    entityId: conversationId,
    after: { nextStage: action.nextStage, confidence: action.confidence, violations }
  });

  return { action, violations };
}
