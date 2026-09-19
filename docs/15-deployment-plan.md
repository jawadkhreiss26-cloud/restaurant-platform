# Deployment Plan

- **Local dev**: `docker-compose up` (Postgres, Redis, mailhog) + `pnpm dev`
  runs `apps/web` and `apps/worker` concurrently, `ADAPTER_MODE=mock`.
- **Staging**: containers built via Dockerfiles in `infra/docker/*`, deployed
  to a single always-on region close to Iraq (e.g., a European or Gulf
  region) behind HTTPS; managed Postgres + managed Redis; secrets from a
  cloud secret manager; `ADAPTER_MODE` per-integration (mock until real
  credentials are entered in Admin → Integrations, which flips a DB-backed
  config flag read by the adapter factory — no redeploy needed to go live on
  an integration).
- **Production**: same containers, autoscaled worker pool (queue depth-based),
  read replica for analytics queries once volume warrants it, CDN in front of
  `apps/web` for published sites.
- **CI/CD**: GitHub Actions — PR pipeline runs the testing-strategy gates;
  merge to `main` builds images, runs `prisma migrate deploy` against
  staging, runs smoke E2E, then requires manual approval to promote to
  production (blue/green or rolling, given a single Next.js/worker image
  pair).
- **IaC**: Terraform modules in `infra/terraform` for network, managed
  Postgres, managed Redis, container service, secret manager bindings —
  written against generic resources where possible; a short README notes the
  1-2 provider-specific resources (e.g., managed Postgres) that need
  swapping per chosen cloud.
- **Rollback**: previous container image kept warm; migrations are additive-
  first (no destructive migration ships without a two-step deprecate/remove
  cycle) so a rollback never strands the DB schema ahead of the code.
- **Observability**: structured JSON logs shipped to a log sink; metrics
  (queue depth, job failures, webhook error rate, AI escalation rate, AI cost/
  turn) on a dashboard; error tracking (Sentry-compatible) on both apps;
  alerts on: webhook signature failures spike, payment webhook failures,
  AI cost budget threshold, queue backlog age, hosting-renewal sweep failure.
