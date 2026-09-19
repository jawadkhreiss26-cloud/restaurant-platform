# Meta Messaging Architecture

## Accounts & auth
Admin connects one Instagram Professional account and one Facebook Page via
Meta OAuth (Admin → Integrations → Meta). Tokens stored encrypted in
`MetaAccount`. In mock mode, "connecting" opens a setup screen explaining
exactly which permissions (`instagram_manage_messages`,
`pages_messaging`, etc.) will be requested and simulates a connected account
with fake IDs — clearly labeled "MOCK" in the UI, never presented as live.

## Webhooks
`POST /api/webhooks/meta` — verifies `X-Hub-Signature-256` against the app
secret (constant-time compare); on success enqueues a `ProcessInboundMessage`
job with the raw payload; returns 200 within the required window regardless
of downstream processing (processing is async). Subscription setup (`GET`
challenge) implemented per Meta's verification handshake.

## Messaging-window / eligibility model
`Conversation.messagingWindowExpiresAt` is set from the last customer message
per Meta's standard messaging window; `Conversation.replyEligible` is derived
from it plus any applicable message-tag exception configured by the admin.
`meta.canInitiateConversation(lead)` is the single source of truth the rest of
the system asks before ever sending a business-initiated message; if false,
the only path is the Manual Outreach Queue.

## Unified inbox model
One `Conversation` per (platform, recipient); one `Message` timeline per
conversation, tagged with platform icon. Inbox supports: global AI pause,
per-conversation AI pause, human takeover (claims `assignedUserId`, disables
AI for that conversation until released), internal notes, saved replies,
attachments, search/filter by stage/platform/assignee/opt-out, quiet hours
(computed in Asia/Baghdad — outbound AI/scheduled sends queue until quiet
hours end; human sends are never blocked), retry with backoff on API errors
(status surfaced as `apiErrors[]` on the conversation), and a "failed message"
alert feed.

## Opt-out & compliance
Inbound text is checked against a configurable opt-out phrase list
(Arabic + English) before any AI turn; a match sets `Conversation.optOut =
true`, stops all further outbound (AI and scheduled follow-ups), and logs the
event. `BlockedContact` entries are checked before any outbound send,
including manual ones (with an override + reason for staff, logged).
