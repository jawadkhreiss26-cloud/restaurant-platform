# CRM Pipeline State Machine

States (spec §19), grouped:

```
DISCOVERED → ANALYZING → QUALIFIED | REJECTED
QUALIFIED → DEMO_GENERATING → DEMO_READY | NEEDS_REVIEW
DEMO_READY → MANUAL_OUTREACH_QUEUED | FIRST_MESSAGE_SENT
MANUAL_OUTREACH_QUEUED → FIRST_MESSAGE_SENT
FIRST_MESSAGE_SENT → AWAITING_REPLY
AWAITING_REPLY → API_MESSAGING_ELIGIBLE | CUSTOMER_REPLIED | LOST (timeout)
CUSTOMER_REPLIED → PREVIEW_SENT → DECISION_MAKER_CONFIRMED → INTERESTED
INTERESTED → OBJECTION ⇄ NEGOTIATING → AWAITING_DECISION | FOLLOW_UP_SCHEDULED
INTERESTED|NEGOTIATING → PAYMENT_LINK_SENT → PAYMENT_PENDING →
  PAYMENT_VERIFICATION_REQUIRED → PAID
PAID → CORRECTIONS_PENDING → FINAL_APPROVAL_PENDING → APPROVED → PUBLISHING → PUBLISHED
PUBLISHED → HOSTING_ACTIVE → RENEWAL_APPROACHING → HOSTING_EXPIRED
(any) → LOST | OPTED_OUT | ESCALATED
```

Rules enforced by `packages/core/crm.ts`:
- Transitions are a directed graph; `transition(stage, event)` throws on an
  edge that doesn't exist — no silent skips (e.g., can't go DISCOVERED → PAID).
- Every transition writes an append-only `CrmTransition` row (`actor: ai|human|
  system`, `reason`, timestamps) — satisfies "every stage change must be
  timestamped and logged."
- `ESCALATED` and `OPTED_OUT` are reachable from any state (global edges) and
  freeze AI autonomy for that lead until a human resolves it.
- `LOST` is reachable from any pre-`PAID` state; reason is required
  (`no_reply_timeout | declined | closed_business | duplicate | other`).
- Re-entry: a human can move a lead backward (e.g., `NEGOTIATING` →
  `FOLLOW_UP_SCHEDULED`) but the AI may only move forward or into
  `ESCALATED`/`OPTED_OUT`/`LOST` — it cannot self-approve a backward "reset."
