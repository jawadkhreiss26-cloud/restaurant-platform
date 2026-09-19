import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_SCORING_FACTORS } from "../lib/core/scoring";

const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" }
  });

  const existingPricing = await prisma.pricingConfig.findFirst();
  if (!existingPricing) {
    await prisma.pricingConfig.create({ data: {} });
  }

  for (const f of DEFAULT_SCORING_FACTORS) {
    await prisma.scoringConfig.upsert({
      where: { factor: f.factor },
      update: { weight: f.weight, direction: f.direction },
      create: { factor: f.factor, weight: f.weight, direction: f.direction, label: f.factor }
    });
  }

  const users = [
    { name: "Jawad (Owner)", email: "owner@example.com", role: "OWNER" as const },
    { name: "Admin", email: "admin@example.com", role: "ADMIN" as const },
    { name: "Sales Manager", email: "sales.manager@example.com", role: "SALES_MANAGER" as const },
    { name: "Sales Agent", email: "sales.agent@example.com", role: "SALES_AGENT" as const },
    { name: "Finance Reviewer", email: "finance@example.com", role: "FINANCE_REVIEWER" as const }
  ];

  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash }
    });
  }

  const sampleLeads = [
    {
      restaurantName: "مطعم دجلة الذهبي",
      category: "restaurant",
      cuisineType: "Iraqi grill",
      governorate: "Baghdad",
      city: "Baghdad",
      address: "شارع الرشيد، بغداد",
      phone: "+9647701234567",
      instagramUrl: "https://instagram.com/dijla_gold_example",
      source: "manual"
    },
    {
      restaurantName: "مقهى كربلاء للحلويات",
      category: "dessert",
      cuisineType: "Iraqi sweets",
      governorate: "Karbala",
      city: "Karbala",
      address: "قرب العتبة الحسينية، كربلاء",
      phone: "+9647709876543",
      instagramUrl: "https://instagram.com/karbala_sweets_example",
      source: "manual"
    },
    {
      restaurantName: "بيت الفلافل النجفي",
      category: "food_truck",
      cuisineType: "street food",
      governorate: "Najaf",
      city: "Najaf",
      address: "شارع الكوفة، النجف",
      phone: "+9647705551212",
      source: "csv"
    }
  ];

  for (const lead of sampleLeads) {
    const existing = await prisma.lead.findFirst({ where: { restaurantName: lead.restaurantName } });
    const created = existing ?? (await prisma.lead.create({ data: lead }));

    if (!existing && lead.address) {
      await prisma.leadField.createMany({
        data: [
          {
            leadId: created.id,
            fieldName: "address",
            value: lead.address,
            verificationStatus: "verified",
            sourceUrl: lead.instagramUrl ?? undefined
          },
          {
            leadId: created.id,
            fieldName: "phone",
            value: lead.phone ?? "",
            verificationStatus: "verified"
          }
        ],
        skipDuplicates: true
      }).catch(() => undefined);
    }
  }

  console.log("Seed complete. Demo login: admin@example.com / ChangeMe123! (and owner@example.com, sales.manager@example.com, sales.agent@example.com, finance@example.com, same password).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
