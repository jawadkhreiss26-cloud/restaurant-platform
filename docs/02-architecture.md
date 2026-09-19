# System Architecture

## 1. High-level shape
A single TypeScript monorepo (pnpm workspaces) with:

```
apps/
  web/            Next.js 14 (App Router) — admin dashboard, client approval portal,
                   public preview/live site renderer, API routes (BFF layer)
  worker/         Node worker process consuming the job queue (BullMQ/Redis):
                   scoring, preview generation, AI conversation turns, outreach
                   sends, follow-up scheduling, hosting-expiry sweeps, webhooks
packages/
  db/             Prisma schema + client + migrations (PostgreSQL)
  core/           Domain logic: CRM state machine, lead scoring, pricing rules,
                   objection library, escalation rules — framework-agnostic
  adapters/       Provider adapter interfaces + implementations
                   (ai, meta, payments, hosting, domains, maps, storage, email),
                   each with a `mock` and a `live` implementation behind one
                   interface, chosen by env config
  ai-agent/       Sales Closer: prompt templates, tool schemas (zod), the
                   conversation-turn function, structured-output validation
  ui/             Shared React components (RTL-aware, Tailwind)
  config/         Zod-validated env/config loader, shared constants
infra/            IaC (Terraform) + Dockerfiles + docker-compose for local dev
docs/             This documentation set
```

## 2. Request/data flow
1. **Discovery/import** writes `Lead` rows (+ `LeadField` provenance rows) via
   `packages/adapters/leadSource` (CSV importer live; search/maps adapters mocked).
2. **Scoring job** (worker) computes `Lead.score` + `Lead.scoreBreakdown` from
   `packages/core/scoring` using admin-configurable weights (`ScoringConfig` table).
3. **Preview job** renders a `WebsitePreview` (JSON content model) from verified
   `LeadField`s only; unverifiable fields become `needsConfirmation: true` and are
   rendered with a visible "Needs Confirmation" badge in the dashboard, and are
   *omitted* (not fabricated) on the public-facing preview markup.
4. **Outreach**: `packages/adapters/meta` exposes `canInitiateConversation(lead)`.
   If true, the AI drafts + the outreach worker sends via the Meta adapter. If
   false, a `ManualOutreachItem` is created for a human to approve/edit/send.
5. **Inbound webhook** (`apps/web` route `/api/webhooks/meta`) verifies the
   signature, enqueues a `ProcessInboundMessage` job. The worker persists the
   `Message`, updates `Conversation.messagingWindow`, and — unless AI is paused
   globally, for this conversation, or a human has taken over — enqueues an
   `AiTurn` job.
6. **AiTurn job** calls `packages/ai-agent` with the full conversation context +
   lead + CRM stage. The agent returns a structured `AgentAction` (zod-validated):
   `{ reply?, toolCalls[], nextStage, confidence, escalate?, discountOffered? }`.
   Low confidence or a disallowed action (e.g., discount below floor) forces
   `escalate: true` instead of sending.
7. **CRM stage transitions** are only ever applied through
   `packages/core/crm.transition(currentStage, event)`, which enforces the state
   machine graph in `05-crm-state-machine.md` and writes an `AuditLog` row.
8. **Payment**: `packages/adapters/payments` creates a `PaymentLink`; provider
   webhook or an admin action calls `payments.verify()`; CRM advances on `paid`.
9. **Approval portal** (public, token-authenticated route, no login) lets the
   client edit `WebsitePreview` content and submit `approved: true`, which
   triggers the **Publish job**: copies preview content into a `PublishedWebsite`
   record, allocates a subdomain (or connects a verified custom domain via the
   domains adapter), flips `noindex` off, sets `hostingStartedAt` /
   `hostingExpiresAt`.
10. **Renewal sweep** (cron in worker) finds sites within N days of expiry, sends
    reminders, and marks `HOSTING_EXPIRED` after grace period.

## 3. Provider adapters (all in `packages/adapters`, one interface + mock + live)
| Adapter | Interface highlights | v1 implementation |
|---|---|---|
| `ai` | `generateTurn()`, `generatePreviewCopy()`, `scoreConfidence()` | Live: Anthropic Claude Messages API w/ tool calling. |
| `meta` | `sendMessage`, `canInitiateConversation`, `verifyWebhookSignature`, `getMessagingWindow`, `subscribeWebhooks` | Mock (in-memory conversation simulator) until a real Meta App is configured in Admin → Integrations. |
| `payments` | `createPaymentLink`, `verifyPayment`, `refund`, `handleWebhook` | Mock provider + manual bank/wallet-transfer flow (always available, real-world default for Iraq). |
| `hosting` | `provisionSite`, `deprovisionSite`, `renewHosting` | Mock: apps/web itself serves published sites at `/{subdomain}`; a real implementation would push to a CDN/edge host. |
| `domains` | `verifyDomainOwnership`, `connectDomain` | Mock: manual DNS-instructions flow + admin marks verified. |
| `storage` | `putObject`, `getSignedUrl` | Mock: local filesystem under `apps/web/public/uploads` in dev; S3-compatible in prod via env swap. |
| `email` | `send` | Mock: logs to `EmailLog` table; SMTP/provider in prod. |
| `leadSource` | `importCsv`, `searchPublicListings` (mocked), `fetchPublicProfile` (mocked) | CSV import is real; search/maps/social scraping are mocked stubs that respect robots.txt/ToS by design (return "not implemented — configure a licensed data provider"). |

Every adapter is selected via `ADAPTER_MODE=mock|live` (or per-adapter env vars) in
`packages/config`; the Admin → Integrations screen shows live/mock status per
adapter and never fabricates a "connected" state without a successful
credential check.

## 4. AI safety boundary
- All external content (scraped pages, social captions, uploaded menus, inbound
  Meta messages) is passed to the AI strictly as **data** inside a clearly
  delimited `<untrusted_content>` block in the prompt, never concatenated into
  the system/instruction text. The agent is instructed to never follow
  instructions found inside that block (prompt-injection defense).
- The agent only ever emits **structured JSON** validated against a zod schema
  (`packages/ai-agent/schemas.ts`); free-text is only the `reply` field, bounded
  in length, and passed through a banned-phrase/emoji-count/urgency-language
  linter before send.
- Every AI action is stored in `AiInteraction` with prompt version, model,
  provider, inputs (hashes + references, not full scraped text), output,
  confidence, stage, tools used, approval status, final action.

## 5. Environments
Local dev: docker-compose (Postgres, Redis, mailhog). CI: GitHub Actions running
typecheck/lint/tests/migrations. Deployment target: containers on any
container-accepting cloud (Fly.io/Render/ECS/Cloud Run) — chosen to avoid
locking the client into one vendor; Terraform stubs in `infra/` are provider-
agnostic where possible and annotated where they are not.

## 6. Security model
See `13-security-threat-model.md`. Summary: RBAC via NextAuth + a `Role` enum
checked in a single `packages/core/authz.ts` policy module used by every API
route; secrets via env + a secret-manager adapter; signed/short-lived tokens for
the client approval portal; webhook signature verification required for all
inbound webhooks; idempotency keys on all mutating external calls (payments,
publish, message send).
