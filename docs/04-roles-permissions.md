# Roles & Permissions Matrix

| Capability | Owner | Admin | Sales Mgr | Sales Agent | Website Reviewer | Support | Finance | Client (portal) |
|---|---|---|---|---|---|---|---|---|
| Manage users/roles | ✅ | ✅ | – | – | – | – | – | – |
| Global settings/pricing/kill-switch | ✅ | ✅ | – | – | – | – | – | – |
| Meta integration credentials | ✅ | ✅ | – | – | – | – | – | – |
| Lead CRUD / CSV import | ✅ | ✅ | ✅ | ➕ create | – | – | – | – |
| Lead scoring config | ✅ | ✅ | ✅ | – | – | – | – | – |
| View/edit previews | ✅ | ✅ | ✅ | 👁 view | ✅ | – | – | own only |
| Manual outreach queue: approve/send | ✅ | ✅ | ✅ | ✅ | – | – | – | – |
| Meta inbox: view/reply | ✅ | ✅ | ✅ | ✅ | – | 👁 view | – | – |
| Human takeover | ✅ | ✅ | ✅ | ✅ | – | ✅ | – | – |
| Global/conversation AI pause | ✅ | ✅ | ✅ | – | – | – | – | – |
| CRM stage override | ✅ | ✅ | ✅ | ➕ own leads | – | – | – | – |
| Discount below floor ($39) | ✅ | ✅ | ✅ | ❌ escalate | – | – | – | – |
| Payment links: create | ✅ | ✅ | ✅ | ✅ | – | – | 👁 view | – |
| Payment verification | ✅ | ✅ | – | – | – | – | ✅ | – |
| Refunds/disputes | ✅ | ✅ | – | – | – | – | ✅ | request only |
| Publish website | ✅ | ✅ | ✅ | – | ✅ | – | – | approve (triggers) |
| Domain/hosting management | ✅ | ✅ | – | – | – | ✅ | – | request only |
| Client portal: edit own site, pay, approve, request deletion | – | – | – | – | – | – | – | ✅ |
| Analytics / reports | ✅ | ✅ | ✅ | 👁 own | 👁 | 👁 | ✅ | – |
| Audit logs | ✅ | ✅ | 👁 | – | – | – | – | – |

Enforcement: a single `packages/core/authz.ts` policy table maps
`(role, action)` → allow/deny/ownOnly, consulted by every API route and
server action. The Client role never authenticates via the staff login; it
only reaches the system through a signed `ApprovalToken` scoped to one lead.
