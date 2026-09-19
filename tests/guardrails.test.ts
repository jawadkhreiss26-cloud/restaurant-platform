import { describe, it, expect } from "vitest";
import { applyGuardrails, containsOptOutPhrase } from "../lib/ai-agent/guardrails";
import type { AgentAction } from "../lib/ai-agent/schemas";

function baseAction(overrides: Partial<AgentAction> = {}): AgentAction {
  return {
    nextStage: "GREETING",
    reply: "هلا بيك أستاذ، شفنا مطعمكم وحبينا نساعدكم بموقع جديد.",
    toolCalls: [],
    confidence: 0.8,
    discountOffered: null,
    escalate: null,
    detectedObjection: null,
    ...overrides
  };
}

describe("AI guardrails", () => {
  it("passes a clean, on-policy action through unchanged", () => {
    const { ok, violations } = applyGuardrails(baseAction(), {
      hasPaymentPermission: false,
      objectionRaisedThisLead: false,
      confidenceThreshold: 0.55
    });
    expect(ok).toBe(true);
    expect(violations).toHaveLength(0);
  });

  it("strips a payment link tool call sent before permission was granted", () => {
    const action = baseAction({ toolCalls: [{ tool: "create_payment_link", args: {} }] });
    const { action: safe, violations } = applyGuardrails(action, {
      hasPaymentPermission: false,
      objectionRaisedThisLead: false,
      confidenceThreshold: 0.55
    });
    expect(safe.toolCalls).toHaveLength(0);
    expect(violations).toContain("payment_link_before_permission");
  });

  it("rejects a discount below the authorized floor and forces escalation", () => {
    const action = baseAction({ discountOffered: 3900 as any });
    // 3900 IS an authorized tier by default, so use a below-floor number to
    // exercise the rejection path via the pricing module directly.
    const belowFloor = baseAction({ discountOffered: 2000 as any });
    const { action: safe, violations } = applyGuardrails(belowFloor, {
      hasPaymentPermission: true,
      objectionRaisedThisLead: true,
      confidenceThreshold: 0.55
    });
    expect(safe.discountOffered).toBeNull();
    expect(safe.escalate?.reason).toBe("price_below_floor");
    expect(violations.some((v) => v.startsWith("discount_rejected"))).toBe(true);
  });

  it("forces escalation on low confidence", () => {
    const action = baseAction({ confidence: 0.2 });
    const { action: safe } = applyGuardrails(action, {
      hasPaymentPermission: false,
      objectionRaisedThisLead: false,
      confidenceThreshold: 0.55
    });
    expect(safe.escalate?.reason).toBe("low_confidence");
  });

  it("detects common opt-out phrases", () => {
    expect(containsOptOutPhrase("لا تراسلني مرة ثانية")).toBe(true);
    expect(containsOptOutPhrase("please stop messaging me")).toBe(true);
    expect(containsOptOutPhrase("شكراً، الموقع حلو")).toBe(false);
  });
});
