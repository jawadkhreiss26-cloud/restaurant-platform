"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { assertCan } from "@/lib/core/authz";
import { getMetaAdapter } from "@/lib/adapters/meta";
import { logAudit } from "@/lib/audit";
import { firstOutreachTemplate } from "@/lib/core/messageTemplates";
import { getSettings } from "@/lib/settings";

export async function queueOutreachAction(leadId: string) {
  const session = await requireSession();
  assertCan(session.role, "outreach:approve_send");

  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  const settings = await getSettings();
  const platform = lead.instagramUrl ? "INSTAGRAM" : "MESSENGER";

  const item = await prisma.manualOutreachItem.create({
    data: {
      leadId,
      platform,
      draftText: firstOutreachTemplate(settings.companyName, lead.restaurantName),
      status: "PENDING_REVIEW"
    }
  });

  await prisma.lead.update({ where: { id: leadId }, data: { status: "MANUAL_OUTREACH_QUEUED" } });
  await prisma.crmTransition.create({
    data: { leadId, fromStage: lead.status, toStage: "MANUAL_OUTREACH_QUEUED", actor: "human" }
  });

  revalidatePath("/dashboard/outreach");
  return item;
}

export async function approveAndSendOutreachAction(formData: FormData) {
  const session = await requireSession();
  assertCan(session.role, "outreach:approve_send");

  const itemId = String(formData.get("itemId"));
  const editedText = String(formData.get("editedText") || "");

  const item = await prisma.manualOutreachItem.findUniqueOrThrow({ where: { id: itemId }, include: { lead: true } });
  const meta = getMetaAdapter();
  const recipientId = `mock_recipient_${item.leadId}`;

  const result = await meta.sendMessage({
    platform: item.platform,
    recipientId,
    text: editedText || item.draftText
  });

  const conversation = await prisma.conversation.upsert({
    where: { id: `${item.leadId}_${item.platform}` },
    update: {},
    create: {
      id: `${item.leadId}_${item.platform}`,
      leadId: item.leadId,
      platform: item.platform,
      recipientId,
      stage: "GREETING"
    }
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "outbound",
      platformMessageId: result.platformMessageId,
      text: editedText || item.draftText,
      aiGenerated: false,
      approvedByUserId: session.id,
      deliveryStatus: result.status === "sent" ? "sent" : "failed"
    }
  });

  await prisma.manualOutreachItem.update({
    where: { id: itemId },
    data: { status: "SENT", editedText: editedText || null, approvedBy: session.name, sentAt: new Date() }
  });

  await prisma.lead.update({ where: { id: item.leadId }, data: { status: "FIRST_MESSAGE_SENT" } });
  await prisma.crmTransition.create({
    data: { leadId: item.leadId, fromStage: item.lead.status, toStage: "FIRST_MESSAGE_SENT", actor: "human" }
  });

  await logAudit({
    actorId: session.id,
    actorType: "user",
    action: "outreach.approve_send",
    entityType: "ManualOutreachItem",
    entityId: itemId
  });

  revalidatePath("/dashboard/outreach");
  revalidatePath("/dashboard/inbox");
}

export async function rejectOutreachAction(formData: FormData) {
  const session = await requireSession();
  assertCan(session.role, "outreach:approve_send");
  const itemId = String(formData.get("itemId"));
  await prisma.manualOutreachItem.update({ where: { id: itemId }, data: { status: "REJECTED" } });
  revalidatePath("/dashboard/outreach");
}
