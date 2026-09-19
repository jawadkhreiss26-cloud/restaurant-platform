# Database Schema (overview)

The Prisma schema (`packages/db/prisma/schema.prisma`) is the source of truth.
This document summarizes intent per table; see that file for exact types/enums.

- **User** — dashboard users. `role: Role`, hashed credentials or SSO id, MFA flag.
- **Role/Permission** — enum-based RBAC (see `04-roles-permissions.md`).
- **Lead** — a discovered/imported restaurant candidate. Governorate, city,
  category, cuisine, phone, instagramUrl, facebookUrl, existingWebsite,
  openingHoursRaw, mapLocation (lat/lng), status, score, scoreBreakdown (JSON),
  source, createdAt.
- **LeadField** — provenance ledger: one row per collected fact
  `{ leadId, fieldName, value, sourceUrl, collectedAt, verificationStatus }` —
  this is what lets the preview generator distinguish confirmed vs. needs-
  confirmation data, and is required by spec §5/§7.
- **ScoringConfig** — admin-editable weight table `{ factor, weight, direction }`.
- **WebsitePreview** — `{ leadId, slug (random), contentJson, template,
  language, noindex=true, needsConfirmationFields[], createdAt, viewedAt[] }`.
- **PublishedWebsite** — `{ leadId, subdomain, customDomain?, contentJson,
  language, publishedAt, hostingStartedAt, hostingExpiresAt, status }`.
- **MetaAccount** — connected IG professional account / FB Page (or mock),
  tokens (encrypted), scopes, connectedAt.
- **Conversation** — `{ leadId, platform, metaConversationId, recipientId,
  messagingWindowExpiresAt, replyEligible, aiPaused, assignedUserId,
  lastCustomerMessageAt, optOut }`.
- **Message** — `{ conversationId, direction, platformMessageId, text,
  attachments[], aiGenerated, aiConfidence, deliveryStatus, readStatus,
  createdAt }`.
- **AiInteraction** — full AI audit row (see architecture §4).
- **ManualOutreachItem** — `{ leadId, draftText, status, editedText?,
  approvedBy?, sentAt? }`.
- **CrmStage / CrmTransition (log)** — current stage on `Lead`, append-only
  transition log with `fromStage, toStage, actor (ai|human|system), reason,
  createdAt`.
- **PricingConfig** — `{ standardPriceUsd, discountTiers[], hostingIncludedMonths,
  hostingRenewalMonthlyUsd, hostingRenewalYearlyUsd, customDomainFeeUsd }`.
- **PaymentLink / Payment** — `{ leadId, provider, amountUsd, status, url,
  externalRef, verifiedBy?, verifiedAt?, receiptUrl? }` + `Refund`, `Dispute`.
- **ApprovalToken** — signed, expiring token granting the client portal access
  to one `Lead`/`WebsitePreview` without a login.
- **CorrectionRequest** — client-submitted edits pending review.
- **FollowUpSchedule** — `{ leadId, dueAt, sequenceStep, status }`.
- **AuditLog** — generic `{ actorId, actorType, action, entityType, entityId,
  before, after, createdAt }` for every state-changing action platform-wide.
- **OptOut / BlockedContact**.
- **Settings** — singleton key/value table for company profile, AI style,
  targeting, limits, working hours, escalation thresholds, budgets, kill-switch.

All monetary fields use integer cents to avoid float drift. All timestamps UTC;
Iraq-time (`Asia/Baghdad`) conversions happen at the presentation/business-rule
layer (e.g., quiet hours).
