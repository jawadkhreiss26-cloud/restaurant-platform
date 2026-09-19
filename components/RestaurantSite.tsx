import type { WebsiteContent } from "@/lib/core/preview";

/**
 * The single premium template (spec §27 "one premium restaurant website
 * template"). Mobile-first, Arabic RTL, renders only confirmed content —
 * fields still needing confirmation are visually flagged, never presented
 * as fact, when `showConfirmationBadges` is true (dashboard/preview
 * context only; the flag is false on a truly published, public site).
 */
export function RestaurantSite({
  content,
  isPreview,
  showConfirmationBadges
}: {
  content: WebsiteContent;
  isPreview: boolean;
  showConfirmationBadges: boolean;
}) {
  const dir = content.language === "ar" ? "rtl" : "ltr";
  const needsConfirmation = (field: string) => content.needsConfirmationFields.includes(field);

  return (
    <div dir={dir} className="min-h-screen bg-white text-gray-900">
      {isPreview && (
        <div className="bg-amber-500 text-white text-center text-sm py-2 px-4 sticky top-0 z-10">
          {dir === "rtl"
            ? "نموذج أولي — ليس الموقع الرسمي للمطعم"
            : "Concept Preview — Not the Official Restaurant Website"}
        </div>
      )}

      <header className="bg-brand-600 text-white p-6 text-center">
        {content.logoUrl && (
          <img src={content.logoUrl} alt={content.restaurantName} className="h-16 mx-auto mb-3 rounded-full bg-white p-1" />
        )}
        <h1 className="text-2xl font-bold">{content.restaurantName}</h1>
        {content.about && <p className="text-sm opacity-90 mt-1 max-w-md mx-auto">{content.about}</p>}
      </header>

      {content.galleryUrls.length > 0 && (
        <section className="grid grid-cols-3 gap-1 p-1">
          {content.galleryUrls.slice(0, 6).map((url, i) => (
            <img key={i} src={url} className="w-full h-24 object-cover" alt="" />
          ))}
        </section>
      )}
      {content.decorativeImagesUsed && (
        <p className="text-[10px] text-gray-400 text-center py-1">
          {dir === "rtl" ? "صور توضيحية — ليست صور فعلية للمطعم" : "Decorative imagery — not actual photos of this restaurant"}
        </p>
      )}

      <section className="p-4">
        <h2 className="font-semibold text-lg mb-3">{dir === "rtl" ? "المنيو" : "Menu"}</h2>
        {content.menu.length === 0 && (
          <p className="text-sm text-gray-400">
            {dir === "rtl" ? "المنيو قيد الإعداد." : "Menu is being prepared."}
          </p>
        )}
        {Object.entries(groupBy(content.menu, (m) => m.category)).map(([category, items]) => (
          <div key={category} className="mb-4">
            <h3 className="text-sm font-medium text-brand-700 mb-2">{category}</h3>
            <ul className="space-y-2">
              {items.map((item, i) => (
                <li key={i} className="flex justify-between text-sm border-b pb-1">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                  </div>
                  {item.priceUsd != null && <div className="font-medium">${item.priceUsd.toFixed(2)}</div>}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {showConfirmationBadges && needsConfirmation("menuJson") && (
          <span className="badge-needs-confirmation">{dir === "rtl" ? "يحتاج تأكيد" : "Needs Confirmation"}</span>
        )}
      </section>

      <section className="p-4 bg-gray-50 space-y-2 text-sm">
        {content.openingHours && (
          <div>
            <b>{dir === "rtl" ? "أوقات العمل: " : "Hours: "}</b>
            {content.openingHours}{" "}
            {showConfirmationBadges && needsConfirmation("openingHoursRaw") && (
              <span className="badge-needs-confirmation">{dir === "rtl" ? "يحتاج تأكيد" : "Needs Confirmation"}</span>
            )}
          </div>
        )}
        {content.address && (
          <div>
            <b>{dir === "rtl" ? "العنوان: " : "Address: "}</b>
            {content.address}
          </div>
        )}
        {content.mapLat && content.mapLng && (
          <div className="h-32 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
            Map: {content.mapLat}, {content.mapLng}
          </div>
        )}
      </section>

      <footer className="p-4 flex gap-2 justify-center sticky bottom-0 bg-white border-t">
        {content.phone && (
          <a href={`tel:${content.phone}`} className="bg-green-600 text-white rounded-full px-4 py-2 text-sm">
            {dir === "rtl" ? "اتصال" : "Call"}
          </a>
        )}
        {content.instagramUrl && (
          <a href={content.instagramUrl} target="_blank" className="bg-pink-600 text-white rounded-full px-4 py-2 text-sm">
            Instagram
          </a>
        )}
        {content.facebookUrl && (
          <a href={content.facebookUrl} target="_blank" className="bg-blue-600 text-white rounded-full px-4 py-2 text-sm">
            Messenger
          </a>
        )}
      </footer>
    </div>
  );
}

function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}
