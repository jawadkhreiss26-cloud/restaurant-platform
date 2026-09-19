# Manual Outreach Workflow

1. Lead reaches `DEMO_READY`. Worker asks `meta.canInitiateConversation(lead)`.
2. If **true** and `Settings.autoFirstMessage` is enabled: AI drafts via the
   `send_preview_message`-style first-touch template (spec §10), the
   guardrail layer checks it (no price detail, one link max, permission-
   seeking tone), and the adapter sends it directly; stage → `FIRST_MESSAGE_SENT`.
3. If **false** (the normal case for cold Iraqi restaurant leads with no prior
   thread): the AI still drafts the message, but it is written to
   `ManualOutreachItem{status: PENDING_REVIEW}` and the lead stage becomes
   `MANUAL_OUTREACH_QUEUED`. It is never sent automatically.
4. A Sales Agent/Manager opens the queue, can edit the text inline, and clicks
   **Approve & Send**, which calls the same `meta.sendMessage` path but
   attributed to the human (`Message.aiGenerated=false`, `approvedBy` set).
   Rejecting a draft returns it to the AI with the rejection reason for a
   redraft, or lets the agent write one from scratch.
5. Once the restaurant replies to a manually-sent message, the inbound
   webhook flips `replyEligible`, and the AI Sales Closer resumes control
   automatically (subject to global/per-conversation AI pause).
6. Rate limits: `Settings.outreachLimits` caps sends per day/per account to
   stay well inside platform norms and avoid spam flags; the queue simply
   backs up (with oldest-highest-score first ordering) when the cap is hit.
