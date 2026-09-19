"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { assertCan } from "@/lib/core/authz";
import { getPaymentsAdapter } from "@/lib/adapters/payments";
import { logAudit } from "@/lib/audit";
import { getPricingConfig } from "@/lib/settings";

export async function createPaymentLinkAction(formData: FormData) {
  const session = await requireSession();
  assertCan(session.role, "payments:create_link");
  const leadId = String(formData.get("leadId"));
  const pricing = await getPricingConfig();

  const payments = getPaymentsAdapter();
  const link = await payments.createPaymentLink({
    leadId,
    amountUsdCents: pricing.standardPriceUsdCents,
    purpose: "setup",
    idempotencyKey: `${leadId}-manual-${Date.now()}`
  });

  await prisma.paymentLink.create({
    data: {
      leadId,
      amountUsdCents: pricing.standardPriceUsdCents,
      url: link.url,
      externalRef: link.externalRef,
      status: "LINK_SENT",
      expiresAt: link.expiresAt
    }
  });

  await prisma.lead.update({ where: { id: leadId }, data: { status: "PAYMENT_LINK_SENT" } });

  revalidatePath("/dashboard/payments");
}

export async function verifyPaymentAction(formData: FormData) {
  const session = await requireSession();
  assertCan(session.role, "payments:verify");
  const leadId = String(formData.get("leadId"));
  const paymentLinkId = String(formData.get("paymentLinkId"));

  const link = await prisma.paymentLink.findUniqueOrThrow({ where: { id: paymentLinkId } });

  const payment = await prisma.payment.create({
    data: {
      leadId,
      paymentLinkId,
      amountUsdCents: link.amountUsdCents,
      status: "PAID",
      provider: link.provider,
      verifiedByUserId: session.id,
      verifiedAt: new Date(),
      receiptUrl: `/receipts/${paymentLinkId}`
    }
  });

  await prisma.paymentLink.update({ where: { id: paymentLinkId }, data: { status: "PAID" } });
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  await prisma.lead.update({ where: { id: leadId }, data: { status: "CORRECTIONS_PENDING" } });
  await prisma.crmTransition.create({
    data: { leadId, fromStage: lead.status, toStage: "CORRECTIONS_PENDING", actor: "human", reason: "payment manually verified" }
  });

  // Issue an approval-portal token now that payment is verified.
  const { nanoid } = await import("nanoid");
  const token = nanoid(32);
  await prisma.approvalToken.create({
    data: { leadId, token, expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) }
  });

  await logAudit({
    actorId: session.id,
    actorType: "user",
    action: "payment.verify",
    entityType: "Payment",
    entityId: payment.id
  });

  revalidatePath("/dashboard/payments");
}
