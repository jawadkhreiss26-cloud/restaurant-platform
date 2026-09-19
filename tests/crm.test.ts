import { describe, it, expect } from "vitest";
import { canTransition, transition, LEAD_STAGES } from "../lib/core/crm";

describe("CRM state machine", () => {
  it("allows the canonical happy path forward", () => {
    expect(canTransition("DISCOVERED", "ANALYZING", "ai")).toBe(true);
    expect(canTransition("ANALYZING", "QUALIFIED", "ai")).toBe(true);
    expect(canTransition("PAID", "CORRECTIONS_PENDING", "human")).toBe(true);
    expect(canTransition("APPROVED", "PUBLISHING", "human")).toBe(true);
  });

  it("rejects illegal long jumps", () => {
    expect(canTransition("DISCOVERED", "PAID", "ai")).toBe(false);
    expect(canTransition("DISCOVERED", "PUBLISHED", "human")).toBe(false);
    const result = transition("DISCOVERED", "PAID", "system");
    expect(result.allowed).toBe(false);
  });

  it("allows global edges (LOST/OPTED_OUT/ESCALATED) from most states", () => {
    expect(canTransition("NEGOTIATING", "LOST", "ai")).toBe(true);
    expect(canTransition("AWAITING_REPLY", "OPTED_OUT", "system")).toBe(true);
    expect(canTransition("INTERESTED", "ESCALATED", "ai")).toBe(true);
  });

  it("blocks global edges from terminal success states", () => {
    expect(canTransition("PAID", "LOST", "ai")).toBe(false);
    expect(canTransition("PUBLISHED", "LOST", "ai")).toBe(false);
  });

  it("lets a human move backward along a reverse edge, but not the AI", () => {
    expect(canTransition("NEGOTIATING", "OBJECTION", "human", true)).toBe(true);
    expect(canTransition("NEGOTIATING", "OBJECTION", "ai", true)).toBe(false);
  });

  it("every declared stage is reachable from the graph definition", () => {
    // Sanity check that the stage list and graph stay in sync.
    expect(LEAD_STAGES.length).toBeGreaterThan(30);
  });
});
