/**
 * Single-source RBAC policy table (spec §23 / docs/04-roles-permissions.md).
 * Every API route/server action must call `can()` rather than re-implementing
 * role checks inline.
 */

export type Role =
  | "OWNER"
  | "ADMIN"
  | "SALES_MANAGER"
  | "SALES_AGENT"
  | "WEBSITE_REVIEWER"
  | "SUPPORT_AGENT"
  | "FINANCE_REVIEWER";

export type Action =
  | "settings:manage"
  | "users:manage"
  | "integrations:manage"
  | "leads:read"
  | "leads:write"
  | "leads:import"
  | "scoring:configure"
  | "preview:read"
  | "preview:write"
  | "outreach:approve_send"
  | "inbox:read"
  | "inbox:reply"
  | "takeover:toggle"
  | "ai:pause"
  | "crm:override"
  | "pricing:discount_below_floor"
  | "payments:create_link"
  | "payments:verify"
  | "payments:refund"
  | "publish:website"
  | "domains:manage"
  | "analytics:read"
  | "audit:read";

const POLICY: Record<Role, Action[]> = {
  OWNER: [
    "settings:manage",
    "users:manage",
    "integrations:manage",
    "leads:read",
    "leads:write",
    "leads:import",
    "scoring:configure",
    "preview:read",
    "preview:write",
    "outreach:approve_send",
    "inbox:read",
    "inbox:reply",
    "takeover:toggle",
    "ai:pause",
    "crm:override",
    "pricing:discount_below_floor",
    "payments:create_link",
    "payments:verify",
    "payments:refund",
    "publish:website",
    "domains:manage",
    "analytics:read",
    "audit:read"
  ],
  ADMIN: [
    "settings:manage",
    "users:manage",
    "integrations:manage",
    "leads:read",
    "leads:write",
    "leads:import",
    "scoring:configure",
    "preview:read",
    "preview:write",
    "outreach:approve_send",
    "inbox:read",
    "inbox:reply",
    "takeover:toggle",
    "ai:pause",
    "crm:override",
    "pricing:discount_below_floor",
    "payments:create_link",
    "payments:verify",
    "payments:refund",
    "publish:website",
    "domains:manage",
    "analytics:read",
    "audit:read"
  ],
  SALES_MANAGER: [
    "leads:read",
    "leads:write",
    "leads:import",
    "scoring:configure",
    "preview:read",
    "preview:write",
    "outreach:approve_send",
    "inbox:read",
    "inbox:reply",
    "takeover:toggle",
    "ai:pause",
    "crm:override",
    "payments:create_link",
    "publish:website",
    "analytics:read"
  ],
  SALES_AGENT: [
    "leads:read",
    "leads:write",
    "preview:read",
    "outreach:approve_send",
    "inbox:read",
    "inbox:reply",
    "takeover:toggle",
    "payments:create_link",
    "analytics:read"
  ],
  WEBSITE_REVIEWER: ["leads:read", "preview:read", "preview:write", "publish:website"],
  SUPPORT_AGENT: ["leads:read", "inbox:read", "inbox:reply", "takeover:toggle", "domains:manage"],
  FINANCE_REVIEWER: ["leads:read", "payments:verify", "payments:refund", "analytics:read"]
};

export function can(role: Role, action: Action): boolean {
  return POLICY[role]?.includes(action) ?? false;
}

export function assertCan(role: Role, action: Action) {
  if (!can(role, action)) {
    const err = new Error(`Forbidden: role ${role} cannot perform ${action}`);
    (err as any).status = 403;
    throw err;
  }
}
