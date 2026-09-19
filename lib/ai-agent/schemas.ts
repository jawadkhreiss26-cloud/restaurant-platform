import { z } from "zod";

/**
 * Structured output contract for the AI Sales Closer (docs/07-ai-tools-schemas.md).
 * The model must return exactly this shape; anything else is treated as a
 * schema failure and forces escalation rather than being guessed at.
 */

export const STAGES = [
  "GREETING",
  "IDENTITY_CONFIRM",
  "DECISION_MAKER_CONFIRM",
  "INTRO",
  "PREVIEW_PERMISSION",
  "PREVIEW_SENT",
  "BENEFITS",
  "OPINION_CHECK",
  "OBJECTION_HANDLING",
  "NEGOTIATION",
  "PACKAGE_CONFIRM",
  "PRICE_EXPLAIN",
  "HOSTING_EXPLAIN",
  "RENEWAL_DOMAIN_EXPLAIN",
  "PAYMENT_PERMISSION",
  "PAYMENT_SENT",
  "PAYMENT_CONFIRMED",
  "CORRECTIONS",
  "APPROVAL",
  "PUBLISHED",
  "SUPPORT_RENEWAL_EXPLAIN"
] as const;

export const OBJECTION_TYPES = [
  "price",
  "instagram_enough",
  "no_need",
  "think_about_it",
  "ask_partner",
  "trust",
  "want_trial",
  "other"
] as const;

export const ESCALATION_REASONS = [
  "price_below_floor",
  "custom_development",
  "contract_change",
  "refund_request",
  "legal_complaint",
  "payment_dispute",
  "angry_or_threatening",
  "ownership_uncertain",
  "image_rights_uncertain",
  "low_confidence",
  "outside_package",
  "meta_restricted",
  "technical_failure"
] as const;

export const ToolCallSchema = z.object({
  tool: z.enum([
    "get_lead_context",
    "get_preview_link",
    "send_preview_message",
    "create_payment_link",
    "schedule_follow_up",
    "escalate",
    "record_correction",
    "transition_stage"
  ]),
  args: z.record(z.any()).default({})
});

export const AgentActionSchema = z
  .object({
    nextStage: z.enum(STAGES),
    reply: z.string().max(600).nullable(),
    toolCalls: z.array(ToolCallSchema).default([]),
    confidence: z.number().min(0).max(1),
    discountOffered: z.union([z.literal(4500), z.literal(3900), z.null()]).optional(),
    escalate: z
      .object({ reason: z.enum(ESCALATION_REASONS) })
      .nullable()
      .optional(),
    detectedObjection: z.enum(OBJECTION_TYPES).nullable().optional()
  })
  .strict();

export type AgentAction = z.infer<typeof AgentActionSchema>;
