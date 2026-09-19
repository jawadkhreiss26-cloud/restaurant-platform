import Link from "next/link";
import { prisma } from "@/lib/db";
import { createLeadAction, importCsvAction } from "./actions";

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Leads</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <form action={createLeadAction} className="bg-white rounded-lg shadow p-4 space-y-2">
          <h2 className="font-medium mb-2">Add lead manually</h2>
          <input name="restaurantName" placeholder="Restaurant name" required className="w-full border rounded px-3 py-1.5 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input name="governorate" placeholder="Governorate" required className="border rounded px-3 py-1.5 text-sm" />
            <input name="city" placeholder="City" required className="border rounded px-3 py-1.5 text-sm" />
          </div>
          <input name="category" placeholder="Category (restaurant/cafe/bakery/dessert/food_truck)" className="w-full border rounded px-3 py-1.5 text-sm" />
          <input name="cuisineType" placeholder="Cuisine type" className="w-full border rounded px-3 py-1.5 text-sm" />
          <input name="address" placeholder="Public address" className="w-full border rounded px-3 py-1.5 text-sm" />
          <input name="phone" placeholder="Public phone" className="w-full border rounded px-3 py-1.5 text-sm" />
          <input name="instagramUrl" placeholder="Instagram URL" className="w-full border rounded px-3 py-1.5 text-sm" />
          <input name="facebookUrl" placeholder="Facebook Page URL" className="w-full border rounded px-3 py-1.5 text-sm" />
          <button className="bg-brand-600 text-white rounded px-4 py-1.5 text-sm">Create lead</button>
        </form>

        <form action={importCsvAction} className="bg-white rounded-lg shadow p-4 space-y-2" encType="multipart/form-data">
          <h2 className="font-medium mb-2">Bulk CSV import</h2>
          <p className="text-xs text-gray-500">
            Columns: restaurantName, governorate, city, category, cuisineType, address, phone,
            instagramUrl, facebookUrl, existingWebsite
          </p>
          <input type="file" name="file" accept=".csv" required className="text-sm" />
          <button className="bg-brand-600 text-white rounded px-4 py-1.5 text-sm">Import CSV</button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">Restaurant</th>
              <th className="p-2">City</th>
              <th className="p-2">Category</th>
              <th className="p-2">Score</th>
              <th className="p-2">Status</th>
              <th className="p-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t hover:bg-gray-50">
                <td className="p-2">
                  <Link href={`/dashboard/leads/${lead.id}`} className="text-brand-700 font-medium">
                    {lead.restaurantName}
                  </Link>
                </td>
                <td className="p-2">{lead.city}, {lead.governorate}</td>
                <td className="p-2">{lead.category}</td>
                <td className="p-2">{lead.score}</td>
                <td className="p-2">
                  <span className="bg-gray-100 rounded px-2 py-0.5 text-xs">{lead.status}</span>
                </td>
                <td className="p-2 text-xs text-gray-500">{lead.source}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500" colSpan={6}>
                  No leads yet — add one manually or import a CSV.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
