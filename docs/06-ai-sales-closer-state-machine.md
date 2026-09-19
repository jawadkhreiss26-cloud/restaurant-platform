# AI Sales Closer — Conversation State Machine & Persona

## Persona contract (enforced in system prompt + output linter)
- Natural, professional Iraqi Arabic; adapts formality to the customer; never
  Lebanese expressions or exaggerated slang; no long messages (hard cap ~500
  chars per reply, enforced post-generation); minimal emoji (linter rejects
  >1 per message); never fake urgency; never invents facts; discloses AI
  status honestly if asked ("المساعد الرقمي الرسمي لشركة ..."); never discusses
  politics/religion/ethnicity/sect (topic-classifier guard on every inbound
  message before generation).

## Conversation stages (maps 1:1 to spec §11's 22 steps, collapsed to states)
`GREETING → IDENTITY_CONFIRM → DECISION_MAKER_CONFIRM → INTRO →
PREVIEW_PERMISSION → PREVIEW_SENT → BENEFITS → OPINION_CHECK →
OBJECTION_OR_INTEREST → OBJECTION_HANDLING ⇄ NEGOTIATION → PACKAGE_CONFIRM →
PRICE_EXPLAIN → HOSTING_EXPLAIN → RENEWAL_DOMAIN_EXPLAIN →
PAYMENT_PERMISSION → PAYMENT_SENT → PAYMENT_CONFIRMED → CORRECTIONS →
APPROVAL → PUBLISHED → SUPPORT_RENEWAL_EXPLAIN`

Each inbound message + current stage → `packages/ai-agent/turn.ts` → the model
returns one structured `AgentAction`:
```ts
{
  nextStage: Stage,
  reply: string | null,      // one short message, one clear next step
  toolCalls: ToolCall[],     // e.g. sendPreviewLink, createPaymentLink
  confidence: number,        // 0-1
  discountOffered?: 45 | 39, // only from authorized tiers, never below floor
  escalate?: { reason: EscalationReason },
  detectedObjection?: 'price'|'instagram_enough'|'no_need'|'think_about_it'|
                      'ask_partner'|'trust'|'want_trial'|'other'
}
```
The agent NEVER emits two questions or two links in one `reply`. A rule layer
(`packages/ai-agent/guardrails.ts`) runs after generation and BEFORE send:
1. Reject/trim replies over the length cap.
2. Reject discounts outside the two authorized tiers (45, 39); anything lower
   forces `escalate`.
3. Reject a reply that contains a payment link before `PAYMENT_PERMISSION` was
   explicitly granted in the transcript.
4. Reject banned phrases (Lebanese expressions list, vague non-committal
   closers like "خبرنا إذا تريد").
5. Force `escalate` on: price <$39 request, refund/dispute/legal keyword,
   anger/threat sentiment above threshold, ownership uncertainty, low
   `confidence` (< admin-configured threshold, default 0.55), Meta API error,
   any request outside the package.

## Tools available to the agent
See `07-ai-tools-schemas.md`.
