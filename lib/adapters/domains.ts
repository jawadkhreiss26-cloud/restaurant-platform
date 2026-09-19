/**
 * Domain adapter. Mock implementation issues manual DNS instructions and
 * requires an admin to mark verification complete; a live implementation
 * would call a registrar/DNS API behind this same interface.
 */

export interface DomainsAdapter {
  getDnsInstructions(domain: string, subdomain: string): { recordType: string; name: string; value: string }[];
}

class MockDomainsAdapter implements DomainsAdapter {
  getDnsInstructions(domain: string, subdomain: string) {
    return [
      { recordType: "CNAME", name: domain, value: `${subdomain}.platform-hosting.example` }
    ];
  }
}

export function getDomainsAdapter(): DomainsAdapter {
  return new MockDomainsAdapter();
}
