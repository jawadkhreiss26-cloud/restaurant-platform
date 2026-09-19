/**
 * Pricing / discount rules (spec §14). The discount FLOOR is enforced here
 * in code, not just in the AI's prompt, so a prompt-injected or hallucinated
 * "give it away free" instruction cannot actually create a payment link
 * below the authorized floor without a human.
 */

export interface PricingConfigLike {
  standardPriceUsdCents: number;
  discountTier1UsdCents: number;
  discountTier2UsdCents: number;
  discountFloorUsdCents: number;
  hostingIncludedMonths: number;
  hostingRenewalMonthlyUsdCents: number;
  hostingRenewalYearlyUsdCents: number;
  customDomainFeeUsdCents: number;
}

export const DEFAULT_PRICING: PricingConfigLike = {
  standardPriceUsdCents: 4900,
  discountTier1UsdCents: 4500,
  discountTier2UsdCents: 3900,
  discountFloorUsdCents: 3900,
  hostingIncludedMonths: 3,
  hostingRenewalMonthlyUsdCents: 500,
  hostingRenewalYearlyUsdCents: 4000,
  customDomainFeeUsdCents: 1500
};

export type DiscountRequestSource = "ai" | "human";

export interface DiscountDecision {
  approved: boolean;
  amountUsdCents: number;
  requiresHumanApproval: boolean;
  reason: string;
}

/**
 * Evaluate a requested price for a deal.
 * - AI may only ever land on `standardPriceUsdCents`, `discountTier1UsdCents`
 *   or `discountTier2UsdCents` (== the floor by default).
 * - Anything below the floor ALWAYS requires human approval, regardless of
 *   who/what requested it.
 */
export function evaluateDiscountRequest(
  requestedUsdCents: number,
  source: DiscountRequestSource,
  pricing: PricingConfigLike = DEFAULT_PRICING,
  objectionRaised: boolean
): DiscountDecision {
  const { standardPriceUsdCents, discountTier1UsdCents, discountTier2UsdCents, discountFloorUsdCents } =
    pricing;

  if (requestedUsdCents < discountFloorUsdCents) {
    return {
      approved: false,
      amountUsdCents: requestedUsdCents,
      requiresHumanApproval: true,
      reason: "Below authorized discount floor — requires administrator approval."
    };
  }

  if (source === "ai") {
    const allowed = [standardPriceUsdCents, discountTier1UsdCents, discountTier2UsdCents];
    if (!allowed.includes(requestedUsdCents)) {
      return {
        approved: false,
        amountUsdCents: requestedUsdCents,
        requiresHumanApproval: true,
        reason: "AI may only offer standard price or the two authorized discount tiers."
      };
    }
    if (requestedUsdCents < standardPriceUsdCents && !objectionRaised) {
      return {
        approved: false,
        amountUsdCents: requestedUsdCents,
        requiresHumanApproval: false,
        reason: "AI must not discount before a genuine objection is raised."
      };
    }
  }

  return {
    approved: true,
    amountUsdCents: requestedUsdCents,
    requiresHumanApproval: false,
    reason: "Within authorized pricing rules."
  };
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
