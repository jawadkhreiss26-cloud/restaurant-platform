import { prisma } from "@/lib/db";

export default async function PublishedPage() {
  const sites = await prisma.publishedWebsite.findMany({ include: { lead: true }, orderBy: { publishedAt: "desc" } });
  const now = Date.now();

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Published Websites &amp; Hosting</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">Restaurant</th>
              <th className="p-2">URL</th>
              <th className="p-2">Published</th>
              <th className="p-2">Hosting expires</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => {
              const daysLeft = Math.round((s.hostingExpiresAt.getTime() - now) / 86400000);
              return (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{s.lead.restaurantName}</td>
                  <td className="p-2 text-xs">
                    <a href={`/s/${s.subdomain}`} target="_blank" className="text-brand-700">
                      /s/{s.subdomain}
                    </a>
                  </td>
                  <td className="p-2 text-xs">{s.publishedAt.toISOString().slice(0, 10)}</td>
                  <td className="p-2 text-xs">
                    {s.hostingExpiresAt.toISOString().slice(0, 10)}{" "}
                    {daysLeft <= 14 && daysLeft > 0 && (
                      <span className="badge-needs-confirmation">renews in {daysLeft}d</span>
                    )}
                    {daysLeft <= 0 && <span className="badge-needs-confirmation">expired</span>}
                  </td>
                  <td className="p-2">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{s.status}</span>
                  </td>
                </tr>
              );
            })}
            {sites.length === 0 && (
              <tr><td className="p-4 text-gray-400" colSpan={5}>No published websites yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
