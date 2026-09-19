import { describe, it, expect } from "vitest";
import { scoreLead, DEFAULT_SCORING_FACTORS, type LeadSignals } from "../lib/core/scoring";

const baseSignals: LeadSignals = {
  isOperating: true,
  hasRecentActivity: true,
  hasWebsite: false,
  websiteLooksBroken: false,
  onlyOnSocial: true,
  menuIsUnclearImages: true,
  hasEnoughInfoForPreview: true,
  hasActiveSocialAccount: true,
  isIndependentlyManaged: true,
  wouldBenefitFromDigitalMenu: true,
  hasClearContactOptions: true,
  hasResponsiveDecisionMaker: true,
  isClosed: false,
  isDuplicate: false,
  isMajorChain: false,
  lacksReliableInfo: false,
  hasNoRecentActivity: false,
  isPreviousOptOut: false,
  isUncertainIdentity: false,
  wasContactedTooManyTimes: false
};

describe("Lead scoring", () => {
  it("scores a strong, no-website, active lead highly", () => {
    const result = scoreLead(baseSignals, DEFAULT_SCORING_FACTORS);
    expect(result.score).toBeGreaterThan(70);
    expect(result.rejected).toBe(false);
  });

  it("hard-rejects a closed restaurant regardless of other positive signals", () => {
    const result = scoreLead({ ...baseSignals, isClosed: true }, DEFAULT_SCORING_FACTORS);
    expect(result.rejected).toBe(true);
    expect(result.rejectReason).toBe("isClosed");
  });

  it("hard-rejects a previous opt-out", () => {
    const result = scoreLead({ ...baseSignals, isPreviousOptOut: true }, DEFAULT_SCORING_FACTORS);
    expect(result.rejected).toBe(true);
  });

  it("clamps score between 0 and 100", () => {
    const worst: LeadSignals = {
      ...baseSignals,
      hasWebsite: true,
      lacksReliableInfo: true,
      hasNoRecentActivity: true,
      isUncertainIdentity: true,
      wasContactedTooManyTimes: true
    };
    const result = scoreLead(worst, DEFAULT_SCORING_FACTORS);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
