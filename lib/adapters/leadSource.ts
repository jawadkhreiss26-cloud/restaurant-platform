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

/**
 * Real automated discovery via the Google Places API (New) — a licensed,
 * ToS-compliant business directory provider (spec §5). Requires
 * GOOGLE_PLACES_API_KEY to be configured. Never scrapes Instagram/Facebook
 * directly, only queries Google's own public Places data.
 */
class GooglePlacesLeadSourceAdapter implements LeadSourceAdapter {
  async searchPublicListings(query: { governorate: string; city?: string }): Promise<DiscoveredLead[]> {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) return [];

    const locationPart = query.city ? `${query.city}, ${query.governorate}` : query.governorate;
    const textQuery = `restaurants in ${locationPart}, Iraq`;

    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus"
      },
      body: JSON.stringify({ textQuery, languageCode: "ar" })
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Google Places search failed: ${res.status} ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      places?: Array<{
        id: string;
        displayName?: { text: string };
        formattedAddress?: string;
        internationalPhoneNumber?: string;
        websiteUri?: string;
        rating?: number;
        userRatingCount?: number;
        businessStatus?: string;
      }>;
    };

    return (data.places ?? [])
      .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY")
      .map((p) => {
        const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${p.id}`;
        const fields: DiscoveredLeadField[] = [];
        if (p.formattedAddress) fields.push({ fieldName: "address", value: p.formattedAddress, sourceUrl: mapsUrl });
        if (p.internationalPhoneNumber) fields.push({ fieldName: "phone", value: p.internationalPhoneNumber, sourceUrl: mapsUrl });
        if (p.websiteUri) fields.push({ fieldName: "existingWebsite", value: p.websiteUri, sourceUrl: p.websiteUri });
        if (p.rating != null) fields.push({ fieldName: "googleRating", value: String(p.rating), sourceUrl: mapsUrl });
        if (p.userRatingCount != null) fields.push({ fieldName: "googleRatingCount", value: String(p.userRatingCount), sourceUrl: mapsUrl });
        fields.push({ fieldName: "googleMapsUrl", value: mapsUrl, sourceUrl: mapsUrl });

        return {
          restaurantName: p.displayName?.text ?? "Unknown",
          governorate: query.governorate,
          city: query.city ?? "",
          fields
        };
      });
  }
}

export function getLeadSourceAdapter(): LeadSourceAdapter {
  if (process.env.GOOGLE_PLACES_API_KEY) return new GooglePlacesLeadSourceAdapter();
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
