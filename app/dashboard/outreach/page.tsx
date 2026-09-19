import { prisma } from "@/lib/db";
import { approveAndSendOutreachAction, rejectOutreachAction, queueOutreachAction } from "./actions";

export default async function OutreachPage() {
  const pending = await prisma.manualOutreachItem.findMany({
    where: { status: "PENDING_REVIEW" },
    include: { lead: true },
    orderBy: { createdAt: "asc" }
  });

  const readyForOutreach = await prisma.lead.findMany({
    where: { status: "DEMO_READY" },
    orderBy: { score: "desc" }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Manual Outreach Queue</h1>
      <p className="text-sm text-gray-500">
        Meta's messaging rules don't allow the AI to cold-message a restaurant that has never
        replied. Every first-touch draft below must be reviewed and sent by a human from the real
        Instagram/Facebook account.
      </p>

      {readyForOutreach.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-medium mb-2">Leads ready for a first-touch draft</h2>
          <ul className="space-y-2">
            {readyForOutreach.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between text-sm">
                <span>{lead.restaurantName} · {lead.city} · score {lead.score}</span>
                <form action={async () => { "use server"; await queueOutreachAction(lead.id); }}>
                  <button className="bg-gray-800 text-white rounded px-3 py-1 text-xs">
                    Draft first message
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {pending.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium mb-1">
              {item.lead.restaurantName} · {item.platform}
            </div>
            <form action={approveAndSendOutreachAction} className="space-y-2">
              <input type="hidden" name="itemId" value={item.id} />
              <textarea
                name="editedText"
                defaultValue={item.draftText}
                dir="rtl"
                className="w-full border rounded p-2 text-sm"
                rows={3}
              />
              <div className="flex gap-2">
                <button className="bg-brand-600 text-white rounded px-3 py-1.5 text-sm">
                  Approve &amp; send from real account
                </button>
                <button
                  formAction={rejectOutreachAction}
                  className="bg-white border rounded px-3 py-1.5 text-sm"
                >
                  Reject
                </button>
              </div>
            </form>
          </div>
        ))}
        {pending.length === 0 && <p className="text-sm text-gray-400">Queue is empty.</p>}
      </div>
    </div>
  );
}
