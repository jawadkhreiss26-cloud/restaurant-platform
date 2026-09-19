import { prisma } from "@/lib/db";

export default async function AnalyticsPage() {
  const [
    leadsDiscovered,
    qualified,
    demosGenerated,
    outreachSent,
    replies,
    interested,
    paymentLinksSent,
    dealsClosed,
    optOuts,
    refunds,
    revenue
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: { not: "DISCOVERED" } } }),
    prisma.websitePreview.count(),
    prisma.manualOutreachItem.count({ where: { status: "SENT" } }),
    prisma.conversation.count({ where: { lastCustomerMessageAt: { not: null } } }),
    prisma.lead.count({ where: { status: { in: ["INTERESTED", "NEGOTIATING", "PAYMENT_LINK_SENT", "PAID"] } } }),
    prisma.paymentLink.count(),
    prisma.payment.count({ where: { status: "PAID" } }),
    prisma.lead.count({ where: { status: "OPTED_OUT" } }),
    prisma.payment.count({ where: { status: "REFUNDED" } }),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amountUsdCents: true } })
  ]);

  const closingRate = paymentLinksSent > 0 ? ((dealsClosed / paymentLinksSent) * 100).toFixed(1) : "0.0";
  const replyRate = outreachSent > 0 ? ((replies / outreachSent) * 100).toFixed(1) : "0.0";

  const revenueByCity = await prisma.$queryRawUnsafe<{ city: string; total: number }[]>(`
    SELECT l.city as city, SUM(p.amountUsdCents) as total
    FROM Payment p JOIN Lead l ON l.id = p.leadId
    WHERE p.status = 'PAID'
    GROUP BY l.city
  `).catch(() => []);

  const metrics: [string, string | number][] = [
    ["Leads discovered", leadsDiscovered],
    ["Qualified leads", qualified],
    ["Demos generated", demosGenerated],
    ["Manual outreach sent", outreachSent],
    ["Replies received", replies],
    ["Reply rate", `${replyRate}%`],
    ["Interested leads", interested],
    ["Payment links sent", paymentLinksSent],
    ["Deals closed", dealsClosed],
    ["Closing rate", `${closingRate}%`],
    ["Revenue", `$${((revenue._sum.amountUsdCents ?? 0) / 100).toFixed(2)}`],
    ["Opt-out count", optOuts],
    ["Refunds", refunds]
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Analytics &amp; Reporting</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="bg-white rounded-lg shadow p-4">
            <div className="text-xl font-semibold">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-medium mb-2">Revenue by city</h2>
        <table className="w-full text-sm">
          <tbody>
            {revenueByCity.map((r) => (
              <tr key={r.city} className="border-b last:border-0">
                <td className="py-1">{r.city}</td>
                <td className="py-1">${(Number(r.total) / 100).toFixed(2)}</td>
              </tr>
            ))}
            {revenueByCity.length === 0 && (
              <tr><td className="py-1 text-gray-400">No paid deals yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
