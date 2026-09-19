# Prioritized MVP Backlog

## P0 — must work end-to-end in mock mode (this build)
1. Monorepo scaffold, DB schema + migrations, config/env loader, adapter
   interfaces + mock implementations.
2. Auth + RBAC for staff dashboard.
3. Lead CRUD, CSV import, lead list/detail, scoring engine + configurable
   weights.
4. CRM state machine (core lib) + audit log + dashboard pipeline view.
5. One restaurant website template (Arabic RTL, mobile-first) + preview
   generator + "Needs Confirmation" handling + `/p/[slug]` renderer.
6. Manual Outreach Queue (draft, edit, approve/send against mock Meta
   adapter).
7. Unified Meta inbox UI (mock conversations/messages), human takeover,
   AI pause (global + per-conversation), opt-out handling, quiet hours.
8. AI Sales Closer: prompt + guardrails + tool schemas + turn function wired
   to real Anthropic Claude API; runs against mock inbound messages end-to-end
   through at least: identity confirm → preview send → price objection →
   close → payment permission.
9. Pricing/discount config (admin-editable) enforced in code.
10. Payment adapter (mock) + manual verification screen + payment statuses.
11. Client approval portal (token-based): view preview, edit fields/menu/
    images, request domain, submit notes, approve, view/trigger payment.
12. Publish workflow: preview → published site at mock subdomain, noindex
    removed, hosting dates set.
13. Hosting/renewal tracking + reminder job (mocked email/message send).
14. Admin dashboard shell with the sections in spec §21 (even where some are
    thin in v1) + settings screens from spec §22 + Integrations status page.
15. Analytics: the core funnel counts/rates from spec §21 computed from real
    DB data (not hardcoded).
16. Audit logs viewer.
17. Test suites per `14-testing-strategy.md` for everything above.

## P1 — structured but intentionally stubbed pending real credentials/data
- Live Meta OAuth/webhooks (interface + UI is real; requires a real Meta App).
- Live payment provider webhook (interface real; requires a provider).
- Real lead-discovery search/maps/social adapters (interface + rate-limit/
  robots-respecting design is real; requires licensed data APIs).
- Real hosting/CDN provisioning + real domain DNS verification.
- Optional English bilingual template variant (data model already supports
  `language` — template rendering for EN is a P1 polish pass).

## P2 — post-MVP
- Multi-city automated discovery beyond CSV/manual (once a licensed source is
  chosen).
- Advanced analytics (cohort/city drill-downs, AI cost dashboards beyond
  basic totals).
- MFA rollout, SSO.
- Multiple website templates / theme picker.

## Explicitly out of scope (per spec)
WhatsApp (anywhere), unofficial Instagram/Facebook automation, auto-confirming
payment from a screenshot, AI-authorized discounts below $39 without a human.
