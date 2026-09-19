# Website Generation Workflow (Preview → Publish)

1. **Input**: only `LeadField` rows with `verificationStatus != 'unverified'`
   feed the content model directly as fact; unverifiable-but-plausible fields
   (e.g., an opening-hours guess scraped from a Google listing snippet) are
   included but flagged `needsConfirmation: true` and rendered with a visible
   "Needs Confirmation" badge in the dashboard — never presented as confirmed
   on the public/preview page. Menu items/prices/offers/addresses/hours/
   reviews/certifications are NEVER invented; if a field is missing, the
   template simply omits that section rather than filling a placeholder that
   reads as fact. Decorative stock/AI imagery is allowed only if visibly
   labeled internally as decorative and never claimed to depict the
   restaurant's actual dishes.
2. **Render**: `packages/core/preview.ts` builds a `WebsitePreview.contentJson`
   from the template contract (logo, hero, gallery, menu+categories+items,
   hours, phone, IG/FB buttons, address+map, about, QR code, SEO meta, OG
   image, a11y basics, privacy notice, optimized images, mobile nav) and
   assigns a cryptographically random slug (`nanoid(24)`) — no sequential IDs.
3. **Serve**: `apps/web` route `/p/[slug]` renders it with `<meta
   name="robots" content="noindex,nofollow">` and a persistent banner "Concept
   Preview — Not the Official Restaurant Website" (bilingual). No sitemap
   entry, no internal links to it from any public page.
4. **Share**: the preview URL is the one link sent per spec §12's template.
5. **Corrections**: client portal writes `CorrectionRequest` rows; a reviewer
   (or, for low-risk fields, direct client edit) applies them to
   `WebsitePreview.contentJson`; every edit is diffed into `AuditLog`.
6. **Approval**: client clicks **Approve & Publish** on the portal (requires
   an explicit checkbox, not just "close" or inactivity) → `APPROVED` stage.
7. **Publish job**: copies `contentJson` → new `PublishedWebsite`, removes
   noindex, allocates `{restaurant-slug}.{platformDomain}` or connects a
   verified custom domain, sets hosting dates from `PricingConfig
   .hostingIncludedMonths`, serves at `/s/[subdomain]` (mock hosting adapter)
   with real SEO metadata and OG image.
8. **Post-publish edits**: any further client change re-enters
   `CorrectionRequest` review; nothing writes to `PublishedWebsite` directly
   from the portal without a reviewer or an explicitly low-risk auto-apply
   rule the admin turns on.
