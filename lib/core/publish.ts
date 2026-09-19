import { prisma } from "../db";
import { getHostingAdapter } from "../adapters/hosting";
import { transition } from "./crm";
import { logAudit } from "../audit";

export async function publishWebsite(leadId: string) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId }, include: { preview: true } });
  if (!lead.preview) throw new Error("No preview to publish");

  const t = transition(lead.status as any, "PUBLISHING" as any, "human", { humanOverride: true });
  if (!t.allowed) throw new Error(t.reason);

  const hosting = getHostingAdapter();
  const existing = await prisma.publishedWebsite.findUnique({ where: { leadId } });
  const subdomain = existing?.subdomain ?? (await hosting.provisionSubdomain(lead.restaurantName, leadId));

  const pricing = await prisma.pricingConfig.findFirst();
  const months = pricing?.hostingIncludedMonths ?? 3;
  const now = new Date();
  const expires = new Date(now);
  expires.setMonth(expires.getMonth() + months);

  const published = await prisma.publishedWebsite.upsert({
    where: { leadId },
    update: {
      contentJson: lead.preview.contentJson,
      language: lead.preview.language,
      status: "ACTIVE"
    },
    create: {
      leadId,
      subdomain,
      contentJson: lead.preview.contentJson,
      language: lead.preview.language,
      hostingStartedAt: now,
      hostingExpiresAt: expires
    }
  });

  await prisma.$transaction([
    prisma.lead.update({ where: { id: leadId }, data: { status: "PUBLISHED" } }),
    prisma.crmTransition.create({ data: { leadId, fromStage: lead.status, toStage: "PUBLISHING", actor: "human" } }),
    prisma.crmTransition.create({ data: { leadId, fromStage: "PUBLISHING", toStage: "PUBLISHED", actor: "system" } })
  ]);

  await logAudit({ actorType: "system", action: "website.publish", entityType: "PublishedWebsite", entityId: published.id });

  return published;
}
