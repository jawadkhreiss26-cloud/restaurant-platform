/**
 * Central, validated environment/config loader. Adapter factories read from
 * here rather than touching `process.env` directly, so "is this integration
 * live or mock" is answered in exactly one place.
 */

function isSet(v: string | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export const config = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  adapterMode: (process.env.ADAPTER_MODE as "mock" | "live") || "mock",

  ai: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.AI_MODEL || "claude-sonnet-4-5",
    get isLive() {
      return isSet(process.env.ANTHROPIC_API_KEY);
    }
  },

  meta: {
    appId: process.env.META_APP_ID,
    appSecret: process.env.META_APP_SECRET,
    pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN,
    igAccessToken: process.env.META_IG_ACCESS_TOKEN,
    webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN,
    get isLive() {
      return isSet(process.env.META_APP_ID) && isSet(process.env.META_APP_SECRET);
    }
  },

  payments: {
    apiKey: process.env.PAYMENTS_PROVIDER_API_KEY,
    get isLive() {
      return isSet(process.env.PAYMENTS_PROVIDER_API_KEY);
    }
  }
};

export function integrationStatus() {
  return [
    { name: "AI (Anthropic Claude)", mode: config.ai.isLive ? "live" : "mock" },
    { name: "Meta (Instagram/Facebook)", mode: config.meta.isLive ? "live" : "mock" },
    { name: "Payments", mode: config.payments.isLive ? "live" : "mock" },
    { name: "Hosting", mode: "mock" },
    { name: "Domains", mode: "mock" },
    { name: "Lead discovery (search/maps/social)", mode: "mock" }
  ];
}
