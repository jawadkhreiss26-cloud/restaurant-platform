"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { assertCan } from "@/lib/core/authz";
import { logAudit } from "@/lib/audit";

export async function updateSettingsAction(formData: FormData) {
  const session = await requireSession();
  assertCan(session.role, "settings:manage");

  const data = {
    companyName: String(formData.get("companyName")),
    aiAssistantName: String(formData.get("aiAssistantName")),
    businessDescription: String(formData.get("businessDescription") || "") || null,
    outreachDailyLimit: Number(formData.get("outreachDailyLimit")),
    workingHoursStart: Number(formData.get("workingHoursStart")),
    workingHoursEnd: Number(formData.get("workingHoursEnd")),
    aiConfidenceThreshold: Number(formData.get("aiConfidenceThreshold")),
    autoFirstMessageEnabled: formData.get("autoFirstMessageEnabled") === "on",
    emergencyStop: formData.get("emergencyStop") === "on"
  };

  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data }
  });

  await logAudit({ actorId: session.id, actorType: "user", action: "settings.update", entityType: "Settings", entityId: "singleton" });
  revalidatePath("/dashboard/settings");
}

export async function updatePricingAction(formData: FormData) {
  const session = await requireSession();
  assertCan(session.role, "settings:manage");

  const data = {
    standardPriceUsdCents: Math.round(Number(formData.get("standardPriceUsd")) * 100),
    discountTier1UsdCents: Math.round(Number(formData.get("discountTier1Usd")) * 100),
    discountTier2UsdCents: Math.round(Number(formData.get("discountTier2Usd")) * 100),
    discountFloorUsdCents: Math.round(Number(formData.get("discountFloorUsd")) * 100),
    hostingIncludedMonths: Number(formData.get("hostingIncludedMonths")),
    hostingRenewalMonthlyUsdCents: Math.round(Number(formData.get("hostingRenewalMonthlyUsd")) * 100),
    hostingRenewalYearlyUsdCents: Math.round(Number(formData.get("hostingRenewalYearlyUsd")) * 100),
    customDomainFeeUsdCents: Math.round(Number(formData.get("customDomainFeeUsd")) * 100)
  };

  const existing = await prisma.pricingConfig.findFirst();
  if (existing) {
    await prisma.pricingConfig.update({ where: { id: existing.id }, data });
  } else {
    await prisma.pricingConfig.create({ data });
  }

  await logAudit({ actorId: session.id, actorType: "user", action: "pricing.update", entityType: "PricingConfig", entityId: existing?.id ?? "new" });
  revalidatePath("/dashboard/settings");
}
