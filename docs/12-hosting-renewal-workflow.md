# Hosting & Renewal Workflow

- `PublishedWebsite.hostingExpiresAt = publishedAt + PricingConfig
  .hostingIncludedMonths` (default 3).
- Nightly worker sweep (`hostingRenewalSweep` cron job):
  - `expiresAt - now <= reminderWindowDays` (configurable, default 14/7/1) →
    send renewal reminder via AI/template on the same Meta conversation +
    portal notice, with the monthly/yearly renewal price from
    `PricingConfig`.
  - `now > expiresAt` → stage `HOSTING_EXPIRED`; site serves a friendly
    "hosting expired — renew" holding page instead of 404/deletion, for a
    configurable grace period before any takedown.
  - On renewal payment verified → `hostingExpiresAt` extends by the purchased
    period; stage back to `HOSTING_ACTIVE`.
- Client portal shows current hosting status/expiry and a **Renew** action
  that reuses the payment workflow with the renewal price instead of $49.
- Domain changes: connecting a custom domain mid-lifecycle re-runs domain
  verification without affecting the hosting expiry clock.
