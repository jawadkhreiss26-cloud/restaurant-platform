import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { toggleGlobalAiPauseAction } from "./actions";

export default async function InboxPage() {
  const conversations = await prisma.conversation.findMany({
    include: { lead: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" }
  });
  const settings = await getSettings();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Unified Meta Inbox</h1>
        <form action={toggleGlobalAiPauseAction}>
          <button
            className={
              settings.globalAiPause
                ? "bg-red-600 text-white rounded px-3 py-1.5 text-sm"
                : "bg-white border rounded px-3 py-1.5 text-sm"
            }
          >
            {settings.globalAiPause ? "Global AI pause: ON (click to resume)" : "Pause AI globally"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow divide-y">
        {conversations.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/inbox/${c.id}`}
            className="flex items-center justify-between p-3 hover:bg-gray-50"
          >
            <div>
              <div className="text-sm font-medium">
                {c.lead.restaurantName} <span className="text-xs text-gray-400">· {c.platform}</span>
              </div>
              <div className="text-xs text-gray-500 truncate max-w-md">
                {c.messages[0]?.text ?? "(no messages yet)"}
              </div>
            </div>
            <div className="flex gap-1 text-xs">
              {c.humanTakeover && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">human</span>}
              {c.aiPaused && <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded">AI paused</span>}
              {c.optOut && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">opted out</span>}
              <span className="bg-gray-100 px-2 py-0.5 rounded">{c.stage}</span>
            </div>
          </Link>
        ))}
        {conversations.length === 0 && (
          <p className="p-4 text-sm text-gray-400">
            No conversations yet — approve and send a first message from the Manual Outreach Queue.
          </p>
        )}
      </div>
    </div>
  );
}
