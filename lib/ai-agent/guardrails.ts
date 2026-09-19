import type { AgentAction } from "./schemas";
import { evaluateDiscountRequest, DEFAULT_PRICING } from "../core/pricing";

/**
 * Post-generation guardrail layer (docs/06). Runs AFTER the model responds
 * and BEFORE anything is sent or persisted as an approved action. This is
 * the actual enforcement point for the business/safety rules — the system
 * prompt asks the model nicely; this code makes the unsafe paths physically
 * impossible.
 */

const BANNED_PHRASES = [
  "خبرنا إذا تريد",
  "إحنا موجودين",
  "فكر بالموضوع",
  "إذا حبيت ارجع لنا",
  // Lebanese-flavored expressions the persona must avoid
  "شو القصة",
  "يلا بينا",
  "تمام كتير"
];

const SENSITIVE_TOPIC_KEYWORDS = [
  "سياس", // politics
  "دين", // religion (careful: this can false-positive on unrelated words; kept simple for MVP)
  "طائف", // sectarian
  "عرق" // ethnicity
];

export interface GuardrailContext {
  hasPaymentPermission: boolean;
  objectionRaisedThisLead: boolean;
  confidenceThreshold: number;
}

export interface GuardrailResult {
  ok: boolean;
  action: AgentAction;
  violations: string[];
}

export function applyGuardrails(action: AgentAction, ctx: GuardrailContext): GuardrailResult {
  const violations: string[] = [];
  let safeAction: AgentAction = { ...action };

  // 1. Length cap (schema already enforces 600 chars; double-check + trim).
  if (safeAction.reply && safeAction.reply.length > 500) {
    violations.push("reply_too_long");
    safeAction.reply = safeAction.reply.slice(0, 480) + "…";
  }

  // 2. Banned phrases (vague non-committal closers, Lebanese expressions).
  if (safeAction.reply) {
    for (const phrase of BANNED_PHRASES) {
      if (safeAction.reply.includes(phrase)) {
        violations.push(`banned_phrase:${phrase}`);
      }
    }
  }

  // 3. Sensitive topics -> force escalation, blank the reply.
  if (safeAction.reply) {
    for (const kw of SENSITIVE_TOPIC_KEYWORDS) {
      if (safeAction.reply.includes(kw)) {
        violations.push("sensitive_topic");
        safeAction = {
          ...safeAction,
          reply: null,
          escalate: { reason: "outside_package" }
        };
        break;
      }
    }
  }

  // 4. Payment link timing: a create_payment_link tool call is only valid if
  // explicit permission was already granted in this conversation.
  const hasPaymentToolCall = safeAction.toolCalls.some((t) => t.tool === "create_payment_link");
  if (hasPaymentToolCall && !ctx.hasPaymentPermission) {
    violations.push("payment_link_before_permission");
    safeAction = {
      ...safeAction,
      toolCalls: safeAction.toolCalls.filter((t) => t.tool !== "create_payment_link")
    };
  }

  // 5. Discount floor enforcement — independent of what the model claims.
  if (safeAction.discountOffered) {
    const decision = evaluateDiscountRequest(
      safeAction.discountOffered,
      "ai",
      DEFAULT_PRICING,
      ctx.objectionRaisedThisLead
    );
    if (!decision.approved) {
      violations.push(`discount_rejected:${decision.reason}`);
      safeAction = { ...safeAction, discountOffered: null };
      if (decision.requiresHumanApproval) {
        safeAction = { ...safeAction, escalate: { reason: "price_below_floor" } };
      }
    }
  }

  // 6. Low confidence forces escalation instead of sending.
  if (safeAction.confidence < ctx.confidenceThreshold && !safeAction.escalate) {
    violations.push("low_confidence");
    safeAction = { ...safeAction, escalate: { reason: "low_confidence" } };
  }

  // 7. If escalated, never send the reply as if nothing happened — the
  // conversation freezes for a human, but the customer still gets a short,
  // honest holding message via the caller (not fabricated here).
  return { ok: violations.length === 0, action: safeAction, violations };
}

export function containsOptOutPhrase(text: string): boolean {
  const phrases = ["لا تراسلني", "أوقف", "unsubscribe", "stop", "لا أريد"];
  const lower = text.toLowerCase();
  return phrases.some((p) => lower.includes(p.toLowerCase()));
}
