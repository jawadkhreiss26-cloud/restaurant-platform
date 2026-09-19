# Estimated Costs (monthly, USD, rough order-of-magnitude)

Assumptions: mock adapters cost ~$0; figures below are for when Meta/AI/
payments/hosting adapters are switched to live providers. Real numbers will
vary by chosen vendors — this is for budgeting, not a quote.

| Item | @100 leads/mo | @1,000 leads/mo | @10,000 leads/mo |
|---|---|---|---|
| Compute (web+worker containers) | $20–40 (shared min instance) | $60–150 (autoscale 1-3 instances) | $300–800 (autoscale 4-15 instances) |
| Managed Postgres | $15–25 | $50–100 | $250–500 |
| Managed Redis | $10 | $20–35 | $80–150 |
| Object storage (images) | <$5 | $10–20 | $60–120 |
| AI (Claude API) — discovery/scoring copy + sales conversations, est. ~8-15k tokens/lead through full funnel | $15–40 | $150–400 | $1,500–4,000 |
| Meta API | $0 (no per-message fee for standard messaging under Meta's model; cost is in staff/AI time, not API metering) | $0 | $0 |
| Payment processing fees (if using a %-based processor) | ~2.9%+fixed of GMV | same rate | same rate |
| Domain/hosting adapter (subdomain hosting is effectively bundled in compute; custom domains pass-through registrar cost) | negligible | negligible | negligible |
| Email/notifications | <$5 | $10 | $30–60 |
| Monitoring/error tracking | $0–20 (free tiers) | $30–60 | $100–200 |
| **Rough total (excl. payment %fees)** | **~$70–150/mo** | **~$330–780/mo** | **~$2,300–5,800/mo** |

At a $49 average selling price with, say, a 5–15% lead-to-close rate, revenue
at 1,000 leads/mo (~50–150 sales ≈ $2,450–$7,350 one-time + recurring
hosting) comfortably covers the mid-tier cost estimate above; the AI line is
the fastest-growing cost with volume and is the first thing to monitor
against the admin-configurable AI budget cap.
