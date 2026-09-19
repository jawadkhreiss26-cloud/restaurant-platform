import { prisma } from "./db";

export async function getSettings() {
  let settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  if (!settings) {
    settings = await prisma.settings.create({ data: { id: "singleton" } });
  }
  return settings;
}

export async function getPricingConfig() {
  let pricing = await prisma.pricingConfig.findFirst();
  if (!pricing) {
    pricing = await prisma.pricingConfig.create({ data: {} });
  }
  return pricing;
}
