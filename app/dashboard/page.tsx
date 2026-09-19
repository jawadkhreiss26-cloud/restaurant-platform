import { prisma } from "@/lib/db";
import { integrationStatus } from "@/lib/config";

async function getFunnel() {
  const [leads, qualified, demos, outreachSent, paid, published] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: { notIn: ["REJECTED", "DISCOVERED", "ANALYZING"] } } }),
    prisma.websitePreview.count(),
    prisma.manualOutreachItem.count({ where: { status: "SENT" } }),
    prisma.payment.count({ where: { status: "PAID" } }),
    prisma.publishedWebsite.count()
  ]);
  return { leads, qualified, demos, outreachSent, paid, published };
}

export default async function OverviewPage() {
  const funnel = await getFunnel();
  const integrations = integrationStatus();

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Overview</h1>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {[
          ["Leads", funnel.leads],
          ["Qualified", funnel.qualified],
          ["Demos generated", funnel.demos],
          ["Manual outreach sent", funnel.outreachSent],
          ["Deals paid", funnel.paid],
          ["Published sites", funnel.published]
        ].map(([label, value]) => (
          <div key={label as string} className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-semibold">{value as number}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-medium mb-3">Integration status</h2>
        <table className="w-full text-sm">
          <tbody>
            {integrations.map((i) => (
              <tr key={i.name} className="border-b last:border-0">
                <td className="py-1.5">{i.name}</td>
                <td className="py-1.5">
                  <span
                    className={
                      i.mode === "live"
                        ? "text-green-700 bg-green-100 px-2 py-0.5 rounded text-xs"
                        : "text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-xs"
                    }
                  >
                    {i.mode.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-3">
          Nothing above is ever shown as LIVE unless real credentials were entered in Settings &amp;
          Integrations and validated. Everything runs safely in MOCK mode otherwise.
        </p>
      </div>
    </div>
  );
}
