import Link from "next/link";
import { prisma } from "@/lib/db";
import { LEAD_STAGES } from "@/lib/core/crm";

export default async function PipelinePage() {
  const leads = await prisma.lead.findMany({ orderBy: { updatedAt: "desc" } });
  const byStage = new Map<string, typeof leads>();
  for (const stage of LEAD_STAGES) byStage.set(stage, []);
  for (const lead of leads) byStage.get(lead.status)?.push(lead);

  const activeStages = LEAD_STAGES.filter((s) => (byStage.get(s)?.length ?? 0) > 0);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">CRM Pipeline</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {(activeStages.length ? activeStages : (["DISCOVERED"] as const)).map((stage) => (
          <div key={stage} className="bg-white rounded-lg shadow p-3 w-64 shrink-0">
            <h2 className="text-xs font-semibold text-gray-500 mb-2">
              {stage} ({byStage.get(stage)?.length ?? 0})
            </h2>
            <div className="space-y-2">
              {(byStage.get(stage) ?? []).map((lead) => (
                <Link
                  key={lead.id}
                  href={`/dashboard/leads/${lead.id}`}
                  className="block bg-gray-50 hover:bg-gray-100 rounded p-2 text-sm"
                >
                  <div className="font-medium">{lead.restaurantName}</div>
                  <div className="text-xs text-gray-500">{lead.city} · score {lead.score}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
