import { prisma } from "@/lib/db";
import { LEAD_STAGES } from "@/lib/core/crm";
import {
  runScoringAction,
  generatePreviewAction,
  addLeadFieldAction,
  transitionStageAction
} from "../actions";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      fields: true,
      preview: true,
      conversations: true,
      manualOutreach: true,
      crmTransitions: { orderBy: { createdAt: "desc" } },
      approvalTokens: { orderBy: { createdAt: "desc" }, take: 1 },
      payments: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!lead) return <div>Lead not found.</div>;

  const breakdown = lead.scoreBreakdown ? JSON.parse(lead.scoreBreakdown) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{lead.restaurantName}</h1>
          <p className="text-sm text-gray-500">
            {lead.city}, {lead.governorate} · {lead.category} · Score: {lead.score} · Status:{" "}
            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{lead.status}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <form action={async () => { "use server"; await runScoringAction(lead.id); }}>
            <button className="bg-white border rounded px-3 py-1.5 text-sm">Re-run scoring</button>
          </form>
          <form action={async () => { "use server"; await generatePreviewAction(lead.id); }}>
            <button className="bg-brand-600 text-white rounded px-3 py-1.5 text-sm">
              {lead.preview ? "Regenerate preview" : "Generate preview"}
            </button>
          </form>
        </div>
      </div>

      {lead.approvalTokens[0] && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-medium mb-1">Client approval portal</h2>
          <a className="text-brand-700 text-sm break-all" href={`/portal/${lead.approvalTokens[0].token}`} target="_blank">
            {process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/portal/{lead.approvalTokens[0].token}
          </a>
          <p className="text-xs text-gray-500 mt-1">
            Issued automatically once a payment is verified. Expires {lead.approvalTokens[0].expiresAt.toISOString().slice(0, 10)}.
          </p>
        </div>
      )}

      {lead.preview && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-medium mb-1">Private preview</h2>
          <a className="text-brand-700 text-sm break-all" href={`/p/${lead.preview.slug}`} target="_blank">
            {process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/p/{lead.preview.slug}
          </a>
          <p className="text-xs text-gray-500 mt-1">
            Unlisted, no-index, marked "Concept Preview — Not the Official Restaurant Website".
          </p>
          {JSON.parse(lead.preview.needsConfirmationFields || "[]").length > 0 && (
            <div className="mt-2 flex gap-1 flex-wrap">
              {JSON.parse(lead.preview.needsConfirmationFields).map((f: string) => (
                <span key={f} className="badge-needs-confirmation">Needs Confirmation: {f}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-medium mb-2">Verified / collected fields</h2>
          <table className="w-full text-xs mb-3">
            <thead>
              <tr className="text-left text-gray-500">
                <th>Field</th>
                <th>Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lead.fields.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="py-1">{f.fieldName}</td>
                  <td className="py-1 max-w-[200px] truncate">{f.value}</td>
                  <td className="py-1">{f.verificationStatus}</td>
                </tr>
              ))}
              {lead.fields.length === 0 && (
                <tr><td className="py-1 text-gray-400" colSpan={3}>No fields collected yet.</td></tr>
              )}
            </tbody>
          </table>
          <form action={addLeadFieldAction} className="flex gap-1 flex-wrap">
            <input type="hidden" name="leadId" value={lead.id} />
            <input name="fieldName" placeholder="fieldName (e.g. openingHoursRaw)" className="border rounded px-2 py-1 text-xs flex-1" required />
            <input name="value" placeholder="value" className="border rounded px-2 py-1 text-xs flex-1" required />
            <input name="sourceUrl" placeholder="source URL" className="border rounded px-2 py-1 text-xs flex-1" />
            <select name="verificationStatus" className="border rounded px-2 py-1 text-xs">
              <option value="unverified">unverified</option>
              <option value="verified">verified</option>
              <option value="rejected">rejected</option>
            </select>
            <button className="bg-gray-800 text-white rounded px-3 py-1 text-xs">Add</button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-medium mb-2">Score breakdown</h2>
          <ul className="text-xs space-y-1">
            {breakdown.map((b: any) => (
              <li key={b.factor} className="flex justify-between border-b py-0.5">
                <span>{b.factor}</span>
                <span className={b.contribution < 0 ? "text-red-600" : "text-green-700"}>
                  {b.contribution > 0 ? "+" : ""}
                  {b.contribution}
                </span>
              </li>
            ))}
            {breakdown.length === 0 && <li className="text-gray-400">Not scored yet.</li>}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-medium mb-2">CRM stage</h2>
        <form action={transitionStageAction} className="flex gap-2 items-center">
          <input type="hidden" name="leadId" value={lead.id} />
          <select name="toStage" defaultValue={lead.status} className="border rounded px-2 py-1 text-sm">
            {LEAD_STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button className="bg-gray-800 text-white rounded px-3 py-1.5 text-sm">Move stage</button>
        </form>
        <h3 className="text-xs font-medium mt-4 mb-1 text-gray-500">Transition history</h3>
        <ul className="text-xs space-y-1">
          {lead.crmTransitions.map((t) => (
            <li key={t.id}>
              {t.fromStage} → {t.toStage} <span className="text-gray-400">({t.actor}, {t.createdAt.toISOString()})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
