"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { assertCan } from "@/lib/core/authz";
import { logAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/adapters/leadSource";
import { scoreLead, DEFAULT_SCORING_FACTORS, type LeadSignals } from "@/lib/core/scoring";
import { transition } from "@/lib/core/crm";
import { buildWebsiteContent, generatePreviewSlug } from "@/lib/core/preview";

export async function createLeadAction(formData: FormData) {
  const session = await requireSession();
  assertCan(session.role, "leads:write");

  const lead = await prisma.lead.create({
    data: {
      restaurantName: String(formData.get("restaurantName")),
      category: String(formData.get("category") || "restaurant"),
      cuisineType: String(formData.get("cuisineType") || ""),
      governorate: String(formData.get("governorate")),
      city: String(formData.get("city")),
      address: String(formData.get("address") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      instagramUrl: String(formData.get("instagramUrl") || "") || null,
      facebookUrl: String(formData.get("facebookUrl") || "") || null,
      source: "manual"
    }
  });

  await logAudit({
    actorId: session.id,
    actorType: "user",
    action: "lead.create",
    entityType: "Lead",
    entityId: lead.id,
    after: lead
  });

  revalidatePath("/dashboard/leads");
  redirect(`/dashboard/leads/${lead.id}`);
}

export async function importCsvAction(formData: FormData) {
  const session = await requireSession();
  assertCan(session.role, "leads:import");

  const file = formData.get("file") as File | null;
  if (!file) return;
  const text = await file.text();
  const rows = parseCsv(text);

  let created = 0;
  for (const row of rows) {
    if (!row.restaurantName || !row.governorate || !row.city) continue;
    await prisma.lead.create({
      data: {
        restaurantName: row.restaurantName,
        category: row.category || "restaurant",
        cuisineType: row.cuisineType || null,
        governorate: row.governorate,
        city: row.city,
        address: row.address || null,
        phone: row.phone || null,
        instagramUrl: row.instagramUrl || null,
        facebookUrl: row.facebookUrl || null,
        existingWebsite: row.existingWebsite || null,
        source: "csv"
      }
    });
    created++;
  }

  await logAudit({
    actorId: session.id,
    actorType: "user",
    action: "lead.csv_import",
    entityType: "Lead",
    entityId: "bulk",
    after: { created }
  });

  revalidatePath("/dashboard/leads");
}

export async function runScoringAction(leadId: string) {
  const session = await requireSession();
  assertCan(session.role, "leads:write");

  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  const configs = await prisma.scoringConfig.findMany();
  const factors = configs.length
    ? configs.map((c) => ({ factor: c.factor, weight: c.weight, direction: c.direction as "positive" | "negative" }))
    : DEFAULT_SCORING_FACTORS;

  // Minimal heuristic signal derivation for the MVP — an admin can refine
  // these later; discovery/verification adapters would supply richer
  // signals automatically once configured.
  const signals: LeadSignals = {
    isOperating: true,
    hasRecentActivity: Boolean(lead.instagramUrl || lead.facebookUrl),
    hasWebsite: Boolean(lead.existingWebsite),
    websiteLooksBroken: false,
    onlyOnSocial: !lead.existingWebsite && Boolean(lead.instagramUrl || lead.facebookUrl),
    menuIsUnclearImages: false,
    hasEnoughInfoForPreview: Boolean(lead.address && lead.phone),
    hasActiveSocialAccount: Boolean(lead.instagramUrl || lead.facebookUrl),
    isIndependentlyManaged: true,
    wouldBenefitFromDigitalMenu: true,
    hasClearContactOptions: Boolean(lead.phone || lead.instagramUrl),
    hasResponsiveDecisionMaker: false,
    isClosed: false,
    isDuplicate: false,
    isMajorChain: false,
    lacksReliableInfo: !lead.address && !lead.phone,
    hasNoRecentActivity: !lead.instagramUrl && !lead.facebookUrl,
    isPreviousOptOut: lead.optedOut,
    isUncertainIdentity: false,
    wasContactedTooManyTimes: false
  };

  const result = scoreLead(signals, factors);

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      score: result.score,
      scoreBreakdown: JSON.stringify(result.breakdown),
      status: result.rejected ? "REJECTED" : lead.status === "DISCOVERED" ? "QUALIFIED" : lead.status,
      rejectedReason: result.rejected ? result.rejectReason : null
    }
  });

  await logAudit({
    actorId: session.id,
    actorType: "user",
    action: "lead.score",
    entityType: "Lead",
    entityId: leadId,
    after: result
  });

  revalidatePath(`/dashboard/leads/${leadId}`);
}

export async function generatePreviewAction(leadId: string) {
  const session = await requireSession();
  assertCan(session.role, "preview:write");

  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId }, include: { fields: true } });
  const content = buildWebsiteContent(lead.restaurantName, lead.fields, lead.language as "ar" | "ar_en");

  const existing = await prisma.websitePreview.findUnique({ where: { leadId } });
  const slug = existing?.slug ?? generatePreviewSlug();

  await prisma.websitePreview.upsert({
    where: { leadId },
    update: {
      contentJson: JSON.stringify(content),
      needsConfirmationFields: JSON.stringify(content.needsConfirmationFields)
    },
    create: {
      leadId,
      slug,
      contentJson: JSON.stringify(content),
      needsConfirmationFields: JSON.stringify(content.needsConfirmationFields)
    }
  });

  // Walk the CRM graph forward to DEMO_READY (QUALIFIED -> DEMO_GENERATING ->
  // DEMO_READY) rather than attempting an illegal single-hop jump; each hop
  // is validated and logged individually.
  let currentStage = lead.status;
  const path: string[] = currentStage === "QUALIFIED" ? ["DEMO_GENERATING", "DEMO_READY"] : ["DEMO_READY"];
  for (const nextStage of path) {
    const step = transition(currentStage as any, nextStage as any, "human", { humanOverride: true });
    if (!step.allowed) break;
    await prisma.crmTransition.create({ data: { leadId, fromStage: currentStage, toStage: nextStage, actor: "human" } });
    currentStage = nextStage as any;
  }
  if (currentStage !== lead.status) {
    await prisma.lead.update({ where: { id: leadId }, data: { status: currentStage as any } });
  }

  await logAudit({
    actorId: session.id,
    actorType: "user",
    action: "preview.generate",
    entityType: "Lead",
    entityId: leadId
  });

  revalidatePath(`/dashboard/leads/${leadId}`);
}

export async function addLeadFieldAction(formData: FormData) {
  const session = await requireSession();
  assertCan(session.role, "leads:write");

  const leadId = String(formData.get("leadId"));
  const fieldName = String(formData.get("fieldName"));
  const value = String(formData.get("value"));
  const sourceUrl = String(formData.get("sourceUrl") || "") || null;
  const verificationStatus = String(formData.get("verificationStatus") || "unverified");

  await prisma.leadField.create({
    data: { leadId, fieldName, value, sourceUrl, verificationStatus }
  });

  revalidatePath(`/dashboard/leads/${leadId}`);
}

export async function transitionStageAction(formData: FormData) {
  const session = await requireSession();
  assertCan(session.role, "crm:override");

  const leadId = String(formData.get("leadId"));
  const toStage = String(formData.get("toStage"));
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });

  const result = transition(lead.status as any, toStage as any, "human", { humanOverride: true });
  if (!result.allowed) {
    throw new Error(result.reason);
  }

  await prisma.$transaction([
    prisma.lead.update({ where: { id: leadId }, data: { status: toStage as any } }),
    prisma.crmTransition.create({
      data: { leadId, fromStage: lead.status, toStage, actor: "human", reason: "manual override" }
    })
  ]);

  await logAudit({
    actorId: session.id,
    actorType: "user",
    action: "crm.transition",
    entityType: "Lead",
    entityId: leadId,
    before: { stage: lead.status },
    after: { stage: toStage }
  });

  revalidatePath(`/dashboard/leads/${leadId}`);
}
