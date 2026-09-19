# AI Agent Tools (zod/JSON Schemas)

Implemented in `packages/ai-agent/tools.ts`. All tool calls are executed
server-side only after the guardrail layer approves the surrounding
`AgentAction`; the model never gets direct DB/API access.

- `get_lead_context(leadId)` → verified LeadFields, score, prior objections,
  existing digital presence, language/style history. Read-only.
- `get_preview_link(leadId)` → returns the existing signed preview URL (never
  generates a new one from inside a tool call — generation is a separate
  worker job so content is deterministic and auditable).
- `send_preview_message()` → composes the "here's your preview" template
  (spec §12), subject to the one-link-at-a-time rule.
- `create_payment_link(leadId, amountUsdCents, discountReason?)` → validated
  against `PricingConfig` tiers; rejected if `amountUsdCents` < floor without
  `admin_override=true` from a human-triggered path (tool is unreachable to
  the AI below the floor — it can only request escalation).
- `schedule_follow_up(leadId, delayHours)` → validated against
  `Settings.followUpTiming`; refuses if lead is `OPTED_OUT`/`LOST`.
- `escalate(leadId, reason)` → sets `ESCALATED`, notifies assigned human,
  freezes AI autonomy on that lead.
- `record_correction(leadId, field, value)` → writes a `CorrectionRequest`;
  never writes directly to `PublishedWebsite`.
- `transition_stage(leadId, event)` → the ONLY way stage changes; delegates to
  `packages/core/crm.transition`, so illegal jumps are impossible even if the
  model hallucinates one.

Every tool call and its result is stored on the parent `AiInteraction` row
(`toolsUsed: string[]`) for audit.

## Structured output envelope (top level)
```json
{
  "type": "object",
  "required": ["nextStage", "confidence", "toolCalls"],
  "properties": {
    "nextStage": { "enum": ["GREETING", "..."] },
    "reply": { "type": ["string", "null"], "maxLength": 600 },
    "toolCalls": { "type": "array", "items": { "type": "object" } },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "discountOffered": { "enum": [45, 39, null] },
    "escalate": { "type": ["object", "null"] },
    "detectedObjection": { "type": ["string", "null"] }
  },
  "additionalProperties": false
}
```
Validated with zod on the server; a schema-invalid response is treated as
`confidence: 0` and forces escalation rather than retried blindly (max 1
automatic repair retry with the raw error fed back to the model).
