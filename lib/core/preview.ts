import { nanoid } from "nanoid";

/**
 * Preview/website content model builder (spec §7, docs/11). Only fields
 * with `verificationStatus === "verified"` are treated as fact; everything
 * else is included (if present) but flagged `needsConfirmation` and must be
 * rendered with a visible badge, never as confirmed public information.
 */

export interface LeadFieldLike {
  fieldName: string;
  value: string;
  verificationStatus: string;
  sourceUrl?: string | null;
}

export interface MenuItem {
  name: string;
  description?: string;
  priceUsd?: number;
  category: string;
}

export interface WebsiteContent {
  restaurantName: string;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  galleryUrls: string[];
  menu: MenuItem[];
  openingHours?: string | null;
  phone?: string | null;
  address?: string | null;
  mapLat?: number | null;
  mapLng?: number | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  about?: string | null;
  language: "ar" | "ar_en";
  needsConfirmationFields: string[];
  decorativeImagesUsed: boolean;
}

export function buildWebsiteContent(
  restaurantName: string,
  fields: LeadFieldLike[],
  language: "ar" | "ar_en" = "ar"
): WebsiteContent {
  const get = (name: string) => fields.find((f) => f.fieldName === name);
  const isVerified = (name: string) => get(name)?.verificationStatus === "verified";
  const needsConfirmationFields: string[] = [];

  const confirmedOrNull = (name: string): string | null => {
    const f = get(name);
    if (!f) return null;
    if (f.verificationStatus !== "verified") {
      needsConfirmationFields.push(name);
    }
    return f.value;
  };

  const galleryField = fields.filter((f) => f.fieldName === "galleryImage");
  const menuField = get("menuJson");
  let menu: MenuItem[] = [];
  if (menuField) {
    if (menuField.verificationStatus !== "verified") needsConfirmationFields.push("menuJson");
    try {
      menu = JSON.parse(menuField.value);
    } catch {
      menu = [];
    }
  }

  return {
    restaurantName,
    logoUrl: confirmedOrNull("logoUrl"),
    heroImageUrl: confirmedOrNull("heroImageUrl"),
    galleryUrls: galleryField.map((f) => f.value),
    menu,
    openingHours: confirmedOrNull("openingHoursRaw"),
    phone: confirmedOrNull("phone"),
    address: confirmedOrNull("address"),
    mapLat: get("mapLat") ? Number(get("mapLat")!.value) : null,
    mapLng: get("mapLng") ? Number(get("mapLng")!.value) : null,
    instagramUrl: confirmedOrNull("instagramUrl"),
    facebookUrl: confirmedOrNull("facebookUrl"),
    about: confirmedOrNull("about"),
    language,
    needsConfirmationFields: Array.from(new Set(needsConfirmationFields)),
    decorativeImagesUsed: galleryField.length === 0
  };
}

export function generatePreviewSlug(): string {
  return nanoid(24);
}
