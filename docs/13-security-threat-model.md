# Security Threat Model (STRIDE-style, abbreviated)

| Threat | Vector | Mitigation |
|---|---|---|
| Spoofing | Fake Meta webhook calls | HMAC signature verification on every webhook; reject unsigned/invalid. |
| Spoofing | Fake client-portal access | Signed, single-lead, expiring `ApprovalToken` (JWT, short TTL, rotated on use); no password reuse across leads. |
| Tampering | MITM on data in transit | TLS everywhere; HSTS. |
| Tampering | Direct DB/API field tampering by low-privilege role | RBAC policy table enforced server-side on every mutation, never trusted from client. |
| Repudiation | "AI said something it shouldn't have" disputes | Full `AiInteraction` + `AuditLog` trail, immutable (append-only, no update/delete API). |
| Information disclosure | Leaking API keys/prompts/PII to frontend | All secrets server-only via secret manager adapter; system prompts and internal notes never serialized to client bundles; customer PII limited to public business data only. |
| Information disclosure | SSRF via lead-source URL fetching | Discovery/scraping adapters allow-list schemes/hosts, block internal IP ranges, enforce timeouts. |
| Denial of service | Webhook flood / scraping abuse | Rate limiting (Redis token bucket) per IP/route; queue-based processing decouples spikes from response time. |
| Elevation of privilege | Prompt injection via scraped content or inbound messages instructing the AI to "ignore instructions," discount to $0, or reveal prompts | Untrusted-content delimiting (architecture §4), tool-execution allow-list, guardrail layer that re-validates every AI action against business rules independent of what the model claims, discount floor enforced in code not prompt. |
| Elevation of privilege | Malicious file upload (menu images/logos) | MIME/type/size validation, image re-encoding (strip EXIF/metadata, no SVG execution), antivirus scan hook before storage adapter accepts the file. |
| Injection | SQLi | Prisma parameterized queries only; no raw SQL string concatenation. |
| Injection | XSS in restaurant-provided text (menu descriptions, names) | React auto-escaping + explicit sanitization (DOMPurify) for any rich text; CSP headers. |
| CSRF | Dashboard forms | SameSite=strict session cookies + CSRF token on state-changing routes. |
| Idempotency abuse | Double-charging / double-publish from retries | Idempotency keys required on payment creation/verification and publish jobs. |
| Data retention | Restaurant requests deletion | `deleteRestaurantData(leadId)` cascades preview/published content, retains only legally/financially required payment records, logs the deletion action itself (not the deleted content). |
| Account security | Staff account takeover | Argon2/bcrypt password hashing via managed auth, optional MFA (TOTP), session rotation on privilege-relevant actions, audit on login/role changes. |

Backups: nightly Postgres snapshot + point-in-time recovery target (per
managed Postgres provider); recovery runbook tested quarterly (documented in
`15-deployment-plan.md`). Data retention windows are admin-configurable per
entity class (leads, messages, payments) with legal-minimums as a floor.
