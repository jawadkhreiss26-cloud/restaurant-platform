/**
 * Hosting adapter. Mock implementation "provisions" a site by generating a
 * subdomain slug; the site is then served by this same Next.js app at
 * /s/[subdomain]. A live implementation would push the built site to a
 * CDN/edge host behind this same interface.
 */

export interface HostingAdapter {
  provisionSubdomain(restaurantName: string, leadId: string): Promise<string>;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "restaurant";
}

class MockHostingAdapter implements HostingAdapter {
  async provisionSubdomain(restaurantName: string, leadId: string) {
    const base = slugify(restaurantName);
    return `${base}-${leadId.slice(-6)}`;
  }
}

export function getHostingAdapter(): HostingAdapter {
  return new MockHostingAdapter();
}
