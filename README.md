# Iraq Restaurant Website Platform — MVP

An AI-assisted platform for discovering Iraqi restaurants, generating private
website previews, selling a $49 website+hosting package through Instagram
DM/Facebook Messenger with an Iraqi Arabic AI Sales Closer, collecting
payment, gathering corrections, and publishing the site after explicit
customer approval. No WhatsApp anywhere. See `docs/` for the full PRD,
architecture, schema, state machines, workflows, threat model, testing
strategy, deployment plan, backlog, and cost estimates (spec §28 deliverables).

## ⚠️ Important: this codebase has not been installed/built/tested in this session

The sandbox this was built in has its outbound network access to the npm
registry blocked at the network-policy layer (`registry.npmjs.org` returns
`403 host_not_allowed` even through the session's own egress proxy). That
means `pnpm install`, `next build`, `tsc`, `vitest`, and `prisma generate`
could **not be run or verified here**. Every file was written carefully and
consistently (types, imports, Prisma schema, and API/action signatures were
manually cross-checked), but you should treat this as **unverified code**
until you run the steps below in an environment with normal internet access,
and fix whatever the first `pnpm install && pnpm typecheck` turns up.

## Getting started

```bash
pnpm install
cp .env.example .env          # defaults run entirely in mock mode
pnpm db:generate
pnpm db:migrate                # creates prisma/dev.db (SQLite) and applies the schema
pnpm db:seed                   # creates demo users + 3 sample Iraqi leads
pnpm dev                       # http://localhost:3000
```

Demo staff logins (seeded, password `ChangeMe123!` for all):
`owner@example.com`, `admin@example.com`, `sales.manager@example.com`,
`sales.agent@example.com`, `finance@example.com`.

Everything runs in **mock mode** by default — no real Meta, AI, or payment
credentials required to walk the entire flow end-to-end:

1. **Dashboard → Leads**: add a lead manually or import the sample CSV
   format, then open it and click **Re-run scoring** → **Generate preview**.
2. **Dashboard → Manual Outreach Queue**: draft and "send" (mocked) a first
   message.
3. **Dashboard → Meta Inbox**: open the conversation, use "Simulate an
   incoming customer message" to stand in for the real Meta webhook and
   watch the AI Sales Closer (mock responder if `ANTHROPIC_API_KEY` is
   unset, real Claude if it's set) reply, handle a price objection, and
   eventually create a payment link.
4. **Dashboard → Payments**: click "Mark verified & paid" (this is
   deliberately a human action — nothing auto-confirms payment).
5. Open the client portal link that appears once payment is verified
   (`/portal/<token>` — surfaced in the Payments/Lead detail screens),
   submit a correction, tick the approval checkbox, and publish.
6. **Dashboard → Published Websites**: see the live site and its hosting
   expiry countdown.

## What's real vs. mocked

| Area | State |
|---|---|
| Data model, CRM state machine, scoring, pricing/discount rules, RBAC | Real, fully implemented, unit-tested (`tests/`) |
| Website preview generator, one premium RTL template, publish workflow | Real |
| Client approval portal (token-based, corrections, language, domain request, approve→publish) | Real |
| Manual Outreach Queue, Unified Meta inbox, human takeover, AI pause, opt-out detection, audit log | Real (against a mock Meta adapter) |
| AI Sales Closer (prompt, structured-output schema, guardrails/discount-floor enforcement, escalation rules) | Real logic; calls the real Anthropic Claude API when `ANTHROPIC_API_KEY` is set, otherwise a deterministic mock responder so the flow still runs |
| Payments | Adapter interface + mock/manual-verification flow real; no live processor wired (add one behind `lib/adapters/payments.ts`) |
| Meta (Instagram/Facebook) | Adapter interface + webhook signature verification + eligibility-window logic real; requires a real Meta App + tokens to go live |
| Hosting/domains | Mock adapters (site is served by this same app at `/s/[subdomain]`); swap for a real CDN/DNS provider behind the same interfaces |
| Automated lead discovery (search/maps/social) | Interface defined, intentionally **not implemented** — needs a licensed, ToS-compliant data provider. CSV import and manual entry are fully functional today |
| Background jobs (queue, hosting-renewal sweep, follow-up sweep) | Implemented as plain functions (`worker/`) run inline/on-demand rather than via Redis/BullMQ, to avoid an extra infra dependency in the MVP — see `docs/02-architecture.md` for the production shape |

## Required credentials for a fully live deployment
- `ANTHROPIC_API_KEY` (+ optionally a different `AI_MODEL`) — Claude API for the Sales Closer.
- `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`, `META_IG_ACCESS_TOKEN`, `META_WEBHOOK_VERIFY_TOKEN` — a Meta App with Instagram messaging + Messenger Platform permissions approved.
- `PAYMENTS_PROVIDER_API_KEY` + a real implementation added to `lib/adapters/payments.ts` for your chosen Iraqi-compatible payment method (manual bank/wallet transfer is a legitimate permanent option, not just a placeholder).
- A production Postgres `DATABASE_URL` (swap the `sqlite` provider in `prisma/schema.prisma` to `postgresql`) and Redis if/when you move the worker to a real queue.
- A licensed lead-discovery/maps/business-directory API if you want automated discovery beyond CSV/manual entry.

## Remaining work before real commercial traffic
1. Run `pnpm install` and fix whatever the first real typecheck/lint/test pass surfaces (untested in this sandbox — see the warning above).
2. Swap SQLite → Postgres for staging/production (schema is already written against a generic relational shape; only the `datasource` block changes, plus a fresh `prisma migrate`).
3. Move `lib/core/aiTurn.ts`'s synchronous processing into an actual queue worker (BullMQ/Redis) per `docs/02-architecture.md`, and wire the two sweep functions in `worker/sweeps.ts` to a real scheduler.
4. Implement a live payment adapter and a live Meta adapter with real credentials; the interfaces and mock implementations are ready to swap.
5. Add MFA, tighten session cookie settings for your deployment domain, and complete the Playwright/RTL/mobile visual test suite described in `docs/14-testing-strategy.md` (unit tests for the core rules are included; E2E/browser tests are specified but not yet written in this pass).
6. Connect a licensed lead-discovery data source if automated (non-CSV) discovery is wanted.

## Project layout
See `docs/02-architecture.md`. Short version: `app/` (Next.js App Router —
dashboard, public preview/site renderer, client portal, webhook route),
`lib/core` (CRM/scoring/pricing/authz/preview — pure, tested logic),
`lib/adapters` (provider interfaces + mocks), `lib/ai-agent` (prompt, schema,
guardrails, turn runner), `prisma/` (schema + seed), `worker/` (sweep jobs),
`tests/` (Vitest unit tests), `docs/` (the full pre-implementation
deliverable set from spec §28).
