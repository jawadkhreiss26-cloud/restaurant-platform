/**
 * CRM pipeline state machine — the single authority for legal stage
 * transitions (spec §19, docs/05-crm-state-machine.md).
 *
 * The AI, the API routes, and the dashboard all MUST go through
 * `transition()` rather than writing `Lead.status` directly, so an illegal
 * jump (e.g. DISCOVERED -> PAID) is structurally impossible.
 */

export const LEAD_STAGES = [
  "DISCOVERED",
  "ANALYZING",
  "QUALIFIED",
  "REJECTED",
  "DEMO_GENERATING",
  "DEMO_READY",
  "NEEDS_REVIEW",
  "MANUAL_OUTREACH_QUEUED",
  "FIRST_MESSAGE_SENT",
  "AWAITING_REPLY",
  "API_MESSAGING_ELIGIBLE",
  "CUSTOMER_REPLIED",
  "PREVIEW_SENT",
  "DECISION_MAKER_CONFIRMED",
  "INTERESTED",
  "OBJECTION",
  "NEGOTIATING",
  "AWAITING_DECISION",
  "FOLLOW_UP_SCHEDULED",
  "PAYMENT_LINK_SENT",
  "PAYMENT_PENDING",
  "PAYMENT_VERIFICATION_REQUIRED",
  "PAID",
  "CORRECTIONS_PENDING",
  "FINAL_APPROVAL_PENDING",
  "APPROVED",
  "PUBLISHING",
  "PUBLISHED",
  "HOSTING_ACTIVE",
  "RENEWAL_APPROACHING",
  "HOSTING_EXPIRED",
  "LOST",
  "OPTED_OUT",
  "ESCALATED"
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

// Global edges reachable from (almost) any state.
const GLOBAL_EDGES: LeadStage[] = ["LOST", "OPTED_OUT", "ESCALATED"];
// Terminal-ish states that should not be able to jump to LOST/OPTED_OUT again
// pointlessly, but we still allow re-escalation.
const NO_GLOBAL_FROM: LeadStage[] = ["PAID", "PUBLISHED", "HOSTING_ACTIVE"];

const GRAPH: Record<LeadStage, LeadStage[]> = {
  DISCOVERED: ["ANALYZING"],
  ANALYZING: ["QUALIFIED", "REJECTED"],
  QUALIFIED: ["DEMO_GENERATING"],
  REJECTED: [],
  DEMO_GENERATING: ["DEMO_READY", "NEEDS_REVIEW"],
  NEEDS_REVIEW: ["DEMO_READY"],
  DEMO_READY: ["MANUAL_OUTREACH_QUEUED", "FIRST_MESSAGE_SENT"],
  MANUAL_OUTREACH_QUEUED: ["FIRST_MESSAGE_SENT"],
  FIRST_MESSAGE_SENT: ["AWAITING_REPLY"],
  AWAITING_REPLY: ["API_MESSAGING_ELIGIBLE", "CUSTOMER_REPLIED"],
  API_MESSAGING_ELIGIBLE: ["CUSTOMER_REPLIED"],
  CUSTOMER_REPLIED: ["PREVIEW_SENT"],
  PREVIEW_SENT: ["DECISION_MAKER_CONFIRMED"],
  DECISION_MAKER_CONFIRMED: ["INTERESTED"],
  INTERESTED: ["OBJECTION", "NEGOTIATING", "PAYMENT_LINK_SENT", "FOLLOW_UP_SCHEDULED"],
  OBJECTION: ["NEGOTIATING", "AWAITING_DECISION", "INTERESTED"],
  NEGOTIATING: ["AWAITING_DECISION", "PAYMENT_LINK_SENT", "OBJECTION"],
  AWAITING_DECISION: ["FOLLOW_UP_SCHEDULED", "PAYMENT_LINK_SENT", "NEGOTIATING"],
  FOLLOW_UP_SCHEDULED: ["CUSTOMER_REPLIED", "AWAITING_DECISION"],
  PAYMENT_LINK_SENT: ["PAYMENT_PENDING"],
  PAYMENT_PENDING: ["PAYMENT_VERIFICATION_REQUIRED", "PAID"],
  PAYMENT_VERIFICATION_REQUIRED: ["PAID"],
  PAID: ["CORRECTIONS_PENDING"],
  CORRECTIONS_PENDING: ["FINAL_APPROVAL_PENDING"],
  FINAL_APPROVAL_PENDING: ["APPROVED", "CORRECTIONS_PENDING"],
  APPROVED: ["PUBLISHING"],
  PUBLISHING: ["PUBLISHED"],
  PUBLISHED: ["HOSTING_ACTIVE"],
  HOSTING_ACTIVE: ["RENEWAL_APPROACHING"],
  RENEWAL_APPROACHING: ["HOSTING_ACTIVE", "HOSTING_EXPIRED"],
  HOSTING_EXPIRED: ["HOSTING_ACTIVE"],
  LOST: [],
  OPTED_OUT: [],
  ESCALATED: []
};

export type Actor = "ai" | "human" | "system";

export interface TransitionResult {
  from: LeadStage;
  to: LeadStage;
  allowed: boolean;
  reason?: string;
}

/**
 * Returns whether `to` is a legal transition from `from`, either via the
 * explicit graph or a global edge. Humans may also move a lead BACKWARD
 * along an explicit edge that exists in the reverse direction map (handled
 * by `humanOverride=true`); the AI may never do so.
 */
export function canTransition(
  from: LeadStage,
  to: LeadStage,
  actor: Actor,
  humanOverride = false
): boolean {
  if (from === to) return false;
  if (GLOBAL_EDGES.includes(to) && !NO_GLOBAL_FROM.includes(from)) return true;
  const forwardOk = GRAPH[from]?.includes(to) ?? false;
  if (forwardOk) return true;
  if (actor === "human" && humanOverride) {
    // Humans may move to any state that has `from` somewhere as a normal
    // forward step from `to` (i.e. a legitimate "go back a step").
    return GRAPH[to]?.includes(from) ?? false;
  }
  return false;
}

export function transition(
  from: LeadStage,
  to: LeadStage,
  actor: Actor,
  opts: { humanOverride?: boolean; reason?: string } = {}
): TransitionResult {
  const allowed = canTransition(from, to, actor, opts.humanOverride);
  if (!allowed) {
    return {
      from,
      to,
      allowed: false,
      reason: `Illegal transition ${from} -> ${to} for actor=${actor}`
    };
  }
  return { from, to, allowed: true, reason: opts.reason };
}

export function isTerminal(stage: LeadStage): boolean {
  return GRAPH[stage].length === 0;
}
