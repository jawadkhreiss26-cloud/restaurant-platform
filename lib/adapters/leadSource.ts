/**
 * Lead discovery adapter (spec §5). Only publicly available, ToS/robots.txt
 * -respecting sources are ever modeled. CSV import and manual entry are
 * fully implemented (real, not mocked); automated search/maps/social
 * discovery are stubbed to make the intended interface explicit without
 * ever bypassing logins, CAPTCHAs, or scraping private data.
 */

export interface DiscoveredLeadField {
  fieldName: string;
  value: string;
  sourceUrl?: string;
}

export interface DiscoveredLead {
  restaurantName: string;
  governorate: string;
  city: string;
  fields: DiscoveredLeadField[];
}

export interface LeadSourceAdapter {
  searchPublicListings(query: { governorate: string; city?: string }): Promise<DiscoveredLead[]>;
}

class StubLeadSourceAdapter implements LeadSourceAdapter {
  async searchPublicListings(): Promise<DiscoveredLead[]> {
    // Intentionally not implemented: automated discovery requires a
    // licensed, ToS-compliant data provider (a maps API, a business
    // directory API, etc.) to be configured by an administrator. Until
    // then, leads are created via CSV import or manual entry, which are
    // fully functional.
    return [];
  }
}

export function getLeadSourceAdapter(): LeadSourceAdapter {
  return new StubLeadSourceAdapter();
}

export function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h.trim()] = (values[i] ?? "").trim()));
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
  }
  out.push(cur);
  return out;
}
