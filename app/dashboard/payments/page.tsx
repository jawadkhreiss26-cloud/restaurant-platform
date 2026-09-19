import { prisma } from "@/lib/db";
import { createPaymentLinkAction, verifyPaymentAction } from "./actions";

export default async function PaymentsPage() {
  const links = await prisma.paymentLink.findMany({
    include: { lead: true },
    orderBy: { createdAt: "desc" }
  });
  const leadsNeedingLink = await prisma.lead.findMany({
    where: { status: { in: ["INTERESTED", "NEGOTIATING", "AWAITING_DECISION"] } }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Payments</h1>

      {leadsNeedingLink.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-medium mb-2">Create a payment link</h2>
          <ul className="space-y-2">
            {leadsNeedingLink.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between text-sm">
                <span>{lead.restaurantName}</span>
                <form action={createPaymentLinkAction}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <button className="bg-gray-800 text-white rounded px-3 py-1 text-xs">
                    Create standard-price link
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">Restaurant</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Status</th>
              <th className="p-2">Link</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-2">{l.lead.restaurantName}</td>
                <td className="p-2">${(l.amountUsdCents / 100).toFixed(2)}</td>
                <td className="p-2">
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{l.status}</span>
                </td>
                <td className="p-2 text-xs break-all">{l.url}</td>
                <td className="p-2">
                  {l.status !== "PAID" && (
                    <form action={verifyPaymentAction}>
                      <input type="hidden" name="leadId" value={l.leadId} />
                      <input type="hidden" name="paymentLinkId" value={l.id} />
                      <button className="bg-brand-600 text-white rounded px-3 py-1 text-xs">
                        Mark verified &amp; paid
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {links.length === 0 && (
              <tr><td className="p-4 text-gray-400" colSpan={5}>No payment links yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        Payment is never auto-confirmed from a screenshot — a Finance Reviewer or Admin must click
        "Mark verified &amp; paid" (or a real provider webhook must fire) before a deal advances.
      </p>
    </div>
  );
}
