"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { publishWebsite } from "@/lib/core/publish";
import { getPaymentsAdapter } from "@/lib/adapters/payments";
import { getPricingConfig } from "@/lib/settings";
import { logAudit } from "@/lib/audit";

async function loadValidToken(token: string) {
  const approval = await prisma.approvalToken.findUnique({ where: { token }, include: { lead: { include: { preview: true } } } });
  if (!approval) throw new Error("Invalid link");
  if (approval.expiresAt < new Date()) throw new Error("This link has expired");
  return approval;
}

export async function requestPaymentAction(formData: FormData) {
  const token = String(formData.get("token"));
  const approval = await loadValidToken(token);
  const pricing = await getPricingConfig();
  const payments = getPaymentsAdapter();

  const link = await payments.createPaymentLink({
    leadId: approval.leadId,
    amountUsdCents: pricing.standardPriceUsdCents,
    purpose: "setup",
    idempotencyKey: `${approval.leadId}-portal-${Date.now()}`
  });

  await prisma.paymentLink.create({
    data: {
      leadId: approval.leadId,
      amountUsdCents: pricing.standardPriceUsdCents,
      url: link.url,
      externalRef: link.externalRef,
      status: "LINK_SENT",
      expiresAt: link.expiresAt
    }
  });

  revalidatePath(`/portal/${token}`);
}

export async function submitCorrectionAction(formData: FormData) {
  const token = String(formData.get("token"));
  const approval = await loadValidToken(token);
  const field = String(formData.get("field"));
  const newValue = String(formData.get("newValue"));

  await prisma.correctionRequest.create({
    data: { leadId: approval.leadId, field, newValue, status: "PENDING" }
  });

  // Low-risk contact/text fields auto-apply to the preview content for a
  // smoother client experience; menu/price/image changes stay PENDING for
  // a Website Reviewer, per the workflow doc.
  const AUTO_APPLY_FIELDS = ["phone", "address", "openingHours", "instagramUrl", "facebookUrl", "about"];
  if (AUTO_APPLY_FIELDS.includes(field) && approval.lead.preview) {
    const content = JSON.parse(approval.lead.preview.contentJson);
    content[field] = newValue;
    await prisma.websitePreview.update({
      where: { leadId: approval.leadId },
      data: { contentJson: JSON.stringify(content) }
    });
    await prisma.correctionRequest.updateMany({
      where: { leadId: approval.leadId, field, newValue },
      data: { status: "APPLIED" }
    });
  }

  revalidatePath(`/portal/${token}`);
}

export async function requestLanguageChangeAction(formData: FormData) {
  const token = String(formData.get("token"));
  const approval = await loadValidToken(token);
  const language = String(formData.get("language"));

  if (approval.lead.preview) {
    const content = JSON.parse(approval.lead.preview.contentJson);
    content.language = language;
    await prisma.websitePreview.update({ where: { leadId: approval.leadId }, data: { contentJson: JSON.stringify(content), language } });
  }
  await prisma.lead.update({ where: { id: approval.leadId }, data: { language } });
  revalidatePath(`/portal/${token}`);
}

export async function requestCustomDomainAction(formData: FormData) {
  const token = String(formData.get("token"));
  const approval = await loadValidToken(token);
  const domain = String(formData.get("domain"));

  await prisma.correctionRequest.create({
    data: {
      leadId: approval.leadId,
      field: "customDomainRequest",
      newValue: domain,
      status: "PENDING",
      notes: "Customer requested a custom domain — additional fee applies, per package terms."
    }
  });
  revalidatePath(`/portal/${token}`);
}

export async function approveAndPublishAction(formData: FormData) {
  const token = String(formData.get("token"));
  const approval = await loadValidToken(token);

  const paidPayment = await prisma.payment.findFirst({ where: { leadId: approval.leadId, status: "PAID" } });
  if (!paidPayment) {
    throw new Error("Payment must be verified before publication.");
  }

  await prisma.lead.update({ where: { id: approval.leadId }, data: { status: "FINAL_APPROVAL_PENDING" } });
  await prisma.crmTransition.create({
    data: { leadId: approval.leadId, fromStage: approval.lead.status, toStage: "FINAL_APPROVAL_PENDING", actor: "human", reason: "client submitted approval" }
  });
  await prisma.lead.update({ where: { id: approval.leadId }, data: { status: "APPROVED" } });
  await prisma.crmTransition.create({
    data: { leadId: approval.leadId, fromStage: "FINAL_APPROVAL_PENDING", toStage: "APPROVED", actor: "human", reason: "explicit client approval checkbox" }
  });

  await logAudit({ actorType: "user", action: "portal.approve", entityType: "Lead", entityId: approval.leadId });

  await publishWebsite(approval.leadId);

  revalidatePath(`/portal/${token}`);
}

export async function requestDeletionAction(formData: FormData) {
  const token = String(formData.get("token"));
  const approval = await loadValidToken(token);
  await logAudit({ actorType: "user", action: "portal.request_deletion", entityType: "Lead", entityId: approval.leadId });
  await prisma.correctionRequest.create({
    data: { leadId: approval.leadId, field: "__deletion_request__", newValue: "requested", status: "PENDING" }
  });
  revalidatePath(`/portal/${token}`);
}
