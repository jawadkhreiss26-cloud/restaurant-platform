# Product Requirements Document
## Iraqi Restaurant Website Platform (Codename: "Taboola") — v1 (Iraq-only)

### 1. Purpose
An AI-assisted sales-and-delivery platform that finds Iraqi food businesses without a
proper website, builds them a private preview website automatically, sells them a
$49 website+hosting package through Instagram DM / Facebook Messenger conversations
run by an Iraqi-Arabic AI Sales Closer, collects payment, gathers corrections, and
publishes the live site after explicit customer approval.

### 2. Goals (v1 / MVP)
- Operate only in Iraq; pilot in Baghdad + Karbala; architecture must generalize to
  every Iraqi governorate without redesign (city/governorate is data, not code).
- Every dollar amount, discount tier, hosting period, and renewal price is an admin
  setting, not a constant.
- No WhatsApp anywhere. Only Instagram DM, Facebook Messenger, unified Meta inbox,
  and in-dashboard human takeover.
- All Meta messaging goes through official Graph API / Messenger Platform primitives.
  No browser automation, no login bypass, no unofficial scraping.
- Every AI action is logged, schema-validated, and reversible by a human.
- Every external integration (AI, Meta, payments, hosting, domains, maps, storage,
  email) sits behind a provider adapter interface with a working mock implementation,
  so the whole system runs and demos end-to-end with zero real credentials.

### 3. Non-goals (v1)
- No countries other than Iraq.
- No automated unsolicited first contact where Meta's platform rules do not allow
  business-initiated messaging — those go to a Manual Outreach Queue for a human to
  send from the real IG/FB account.
- No WhatsApp integration, ever.
- No fully autonomous discount negotiation below the lowest authorized tier ($39
  default, configurable) — always escalates to a human.
- No automatic "payment confirmed" from a screenshot — always a human or a verified
  webhook.

### 4. Primary users / roles
Owner, Administrator, Sales Manager, Human Sales Agent, Website Reviewer, Support
Agent, Finance Reviewer, Restaurant Client (external, portal-only). See
`04-roles-permissions.md`.

### 5. Core user journeys
1. **Lead → Preview**: Admin/CSV/discovery creates a Lead → scored → qualified →
   preview site auto-generated from public info → flagged fields needing
   confirmation are never shown as fact on the preview.
2. **Preview → Outreach**: If Meta allows business-initiated messaging for that
   lead, AI drafts + (subject to settings) sends the first message. If not, the
   draft lands in the Manual Outreach Queue for a human to approve and send from
   the real account.
3. **Conversation → Close**: Once the restaurant replies (or messaging is
   eligible), the AI Sales Closer (or a human, via takeover) runs the 22-step flow
   in `06-ai-sales-closer-state-machine.md`: confirm identity → confirm
   decision-maker → share preview → handle objections → close price → send payment
   link → verify payment → collect corrections → get explicit approval → publish.
4. **Payment**: Payment link sent via adapter (mock in v1) → customer pays →
   Admin/Finance Reviewer verifies (or webhook auto-verifies) → CRM advances.
5. **Corrections & Approval**: Restaurant Client portal lets the client edit menu,
   images, hours, contact links, language, request a domain, and submit revision
   notes, then explicitly click "Approve & Publish."
6. **Publish**: System flips the preview to a public, indexed, live site on a
   subdomain (or connected custom domain), records hosting start/expiry (3 months
   default), and sends the live URL to the client.
7. **Renewal**: Hosting expiry is tracked; reminders fire before expiry; unpaid
   sites are marked expired, not deleted, for a configurable grace period.

### 6. Success metrics (from spec §21)
Leads discovered, qualified leads, demos generated, manual outreach sent, replies,
reply rate, preview open rate, interested leads, payment links sent, deals closed,
closing rate, average selling price, discount frequency, revenue (+by city), cost
per demo, AI cost per sale, cloud cost per customer, average time to close,
lost-deal reasons, objection conversion rate, follow-up performance, opt-out rate,
refund rate, hosting renewals, expired sites.

### 7. Constraints & compliance
- Meta Platform Terms: only official Graph API/Messenger Platform, respect the
  24-hour standard messaging window and any message-tag exceptions, respect
  opt-outs, no automation that violates ToS.
- robots.txt and ToS of any discovery source must be respected; no CAPTCHA/login
  bypass; only public data.
- All AI-provided facts about a restaurant must trace to a `sourceUrl` + collection
  date; unverifiable fields render as "Needs Confirmation," never as fact.
- PII minimization: only public business info is collected; no scraping of private
  accounts or personal data.

### 8. MVP scope
See `16-mvp-backlog.md`. In one line: everything in spec §27, running end-to-end in
mock mode, deployable, migratable, tested, and documented — real Meta/payment/
hosting/domain credentials are the only thing separating this MVP from production
traffic.
