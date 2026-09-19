import { describe, it, expect } from "vitest";
import { evaluateDiscountRequest, DEFAULT_PRICING } from "../lib/core/pricing";

describe("Pricing / discount rules", () => {
  it("allows the standard price with no objection", () => {
    const d = evaluateDiscountRequest(DEFAULT_PRICING.standardPriceUsdCents, "ai", DEFAULT_PRICING, false);
    expect(d.approved).toBe(true);
  });

  it("blocks an AI discount before any objection was raised", () => {
    const d = evaluateDiscountRequest(DEFAULT_PRICING.discountTier1UsdCents, "ai", DEFAULT_PRICING, false);
    expect(d.approved).toBe(false);
    expect(d.requiresHumanApproval).toBe(false);
  });

  it("allows an authorized AI discount after a genuine objection", () => {
    const d = evaluateDiscountRequest(DEFAULT_PRICING.discountTier1UsdCents, "ai", DEFAULT_PRICING, true);
    expect(d.approved).toBe(true);
  });

  it("always requires human approval below the floor, regardless of source", () => {
    const belowFloor = DEFAULT_PRICING.discountFloorUsdCents - 100;
    const aiAttempt = evaluateDiscountRequest(belowFloor, "ai", DEFAULT_PRICING, true);
    const humanAttempt = evaluateDiscountRequest(belowFloor, "human", DEFAULT_PRICING, true);
    expect(aiAttempt.approved).toBe(false);
    expect(aiAttempt.requiresHumanApproval).toBe(true);
    expect(humanAttempt.approved).toBe(false);
    expect(humanAttempt.requiresHumanApproval).toBe(true);
  });

  it("rejects an AI discount amount outside the two authorized tiers", () => {
    const d = evaluateDiscountRequest(4200, "ai", DEFAULT_PRICING, true);
    expect(d.approved).toBe(false);
  });
});
