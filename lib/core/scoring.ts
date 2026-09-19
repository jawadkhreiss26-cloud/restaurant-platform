/**
 * Lead scoring engine (spec §6). Weights are admin-configurable via the
 * ScoringConfig table; this module is pure so it is trivially unit-testable.
 */

export interface ScoringFactorInput {
  factor: string;
  weight: number; // positive integer; direction says which way it points
  direction: "positive" | "negative";
}

export interface LeadSignals {
  isOperating: boolean;
  hasRecentActivity: boolean;
  hasWebsite: boolean;
  websiteLooksBroken: boolean;
  onlyOnSocial: boolean;
  menuIsUnclearImages: boolean;
  hasEnoughInfoForPreview: boolean;
  hasActiveSocialAccount: boolean;
  isIndependentlyManaged: boolean;
  wouldBenefitFromDigitalMenu: boolean;
  hasClearContactOptions: boolean;
  hasResponsiveDecisionMaker: boolean;
  // Negative signals
  isClosed: boolean;
  isDuplicate: boolean;
  isMajorChain: boolean;
  lacksReliableInfo: boolean;
  hasNoRecentActivity: boolean;
  isPreviousOptOut: boolean;
  isUncertainIdentity: boolean;
  wasContactedTooManyTimes: boolean;
}

export const DEFAULT_SCORING_FACTORS: ScoringFactorInput[] = [
  { factor: "isOperating", weight: 15, direction: "positive" },
  { factor: "hasRecentActivity", weight: 10, direction: "positive" },
  { factor: "hasWebsite", weight: 15, direction: "negative" }, // no website => big boost handled by inverse
  { factor: "websiteLooksBroken", weight: 8, direction: "positive" },
  { factor: "onlyOnSocial", weight: 10, direction: "positive" },
  { factor: "menuIsUnclearImages", weight: 8, direction: "positive" },
  { factor: "hasEnoughInfoForPreview", weight: 12, direction: "positive" },
  { factor: "hasActiveSocialAccount", weight: 8, direction: "positive" },
  { factor: "isIndependentlyManaged", weight: 6, direction: "positive" },
  { factor: "wouldBenefitFromDigitalMenu", weight: 6, direction: "positive" },
  { factor: "hasClearContactOptions", weight: 4, direction: "positive" },
  { factor: "hasResponsiveDecisionMaker", weight: 8, direction: "positive" },
  { factor: "isClosed", weight: 100, direction: "negative" },
  { factor: "isDuplicate", weight: 100, direction: "negative" },
  { factor: "isMajorChain", weight: 40, direction: "negative" },
  { factor: "lacksReliableInfo", weight: 20, direction: "negative" },
  { factor: "hasNoRecentActivity", weight: 15, direction: "negative" },
  { factor: "isPreviousOptOut", weight: 100, direction: "negative" },
  { factor: "isUncertainIdentity", weight: 20, direction: "negative" },
  { factor: "wasContactedTooManyTimes", weight: 15, direction: "negative" }
];

export interface ScoreResult {
  score: number; // 0-100 clamped
  breakdown: { factor: string; contribution: number }[];
  rejected: boolean;
  rejectReason?: string;
}

export function scoreLead(
  signals: LeadSignals,
  factors: ScoringFactorInput[] = DEFAULT_SCORING_FACTORS
): ScoreResult {
  const byName = new Map(factors.map((f) => [f.factor, f]));
  const breakdown: { factor: string; contribution: number }[] = [];
  let raw = 50; // neutral baseline

  const hardRejectFactors: (keyof LeadSignals)[] = [
    "isClosed",
    "isDuplicate",
    "isMajorChain",
    "isPreviousOptOut"
  ];

  for (const key of Object.keys(signals) as (keyof LeadSignals)[]) {
    const active = signals[key];
    const cfg = byName.get(key);
    if (!cfg || !active) continue;
    const signed = cfg.direction === "positive" ? cfg.weight : -cfg.weight;
    // hasWebsite is special-cased: having NO website is the positive signal.
    const contribution = key === "hasWebsite" ? -cfg.weight : signed;
    raw += contribution;
    breakdown.push({ factor: key, contribution });
  }

  const rejected = hardRejectFactors.some((k) => signals[k]);
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    score,
    breakdown,
    rejected,
    rejectReason: rejected
      ? hardRejectFactors.find((k) => signals[k])
      : undefined
  };
}
