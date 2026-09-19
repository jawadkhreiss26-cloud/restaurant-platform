import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function PreviewsPage() {
  const previews = await prisma.websitePreview.findMany({
    include: { lead: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Private Demos</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">Restaurant</th>
              <th className="p-2">Preview link</th>
              <th className="p-2">Needs confirmation</th>
              <th className="p-2">Views</th>
            </tr>
          </thead>
          <tbody>
            {previews.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2">
                  <Link href={`/dashboard/leads/${p.leadId}`} className="text-brand-700">{p.lead.restaurantName}</Link>
                </td>
                <td className="p-2">
                  <a href={`/p/${p.slug}`} target="_blank" className="text-xs break-all text-gray-600">/p/{p.slug}</a>
                </td>
                <td className="p-2 text-xs">{JSON.parse(p.needsConfirmationFields || "[]").length}</td>
                <td className="p-2 text-xs">{p.viewCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
