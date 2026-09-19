import { prisma } from "@/lib/db";
import {
  simulateInboundAction,
  sendHumanMessageAction,
  toggleTakeoverAction,
  toggleAiPauseAction,
  addNoteAction
} from "../actions";

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      lead: true,
      messages: { orderBy: { createdAt: "asc" } },
      notes: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!conversation) return <div>Conversation not found.</div>;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">
            {conversation.lead.restaurantName} · {conversation.platform}
          </h1>
          <div className="flex gap-2">
            <form action={toggleAiPauseAction}>
              <input type="hidden" name="conversationId" value={conversation.id} />
              <button className="border rounded px-3 py-1 text-xs bg-white">
                {conversation.aiPaused ? "Resume AI" : "Pause AI (this chat)"}
              </button>
            </form>
            <form action={toggleTakeoverAction}>
              <input type="hidden" name="conversationId" value={conversation.id} />
              <button className="border rounded px-3 py-1 text-xs bg-white">
                {conversation.humanTakeover ? "Release to AI" : "Take over"}
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 space-y-3 max-h-[500px] overflow-y-auto" dir="rtl">
          {conversation.messages.map((m) => (
            <div
              key={m.id}
              className={
                m.direction === "inbound"
                  ? "bg-gray-100 rounded-lg p-2 text-sm max-w-[80%]"
                  : "bg-brand-50 rounded-lg p-2 text-sm max-w-[80%] ml-auto"
              }
            >
              <div>{m.text}</div>
              <div className="text-[10px] text-gray-400 mt-1" dir="ltr">
                {m.direction} · {m.aiGenerated ? "AI" : "human"} · {m.deliveryStatus}
                {m.aiConfidence != null ? ` · conf ${m.aiConfidence.toFixed(2)}` : ""}
              </div>
            </div>
          ))}
          {conversation.messages.length === 0 && <p className="text-sm text-gray-400">No messages yet.</p>}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-medium mb-2">Simulate an incoming customer message (mock Meta)</h2>
          <form action={simulateInboundAction} className="flex gap-2">
            <input type="hidden" name="conversationId" value={conversation.id} />
            <input name="text" dir="rtl" placeholder="اكتب رسالة الزبون هنا..." className="flex-1 border rounded px-3 py-1.5 text-sm" required />
            <button className="bg-gray-800 text-white rounded px-3 py-1.5 text-sm">Send as customer</button>
          </form>
          <p className="text-xs text-gray-400 mt-1">
            Stands in for the real Meta webhook until a live Instagram/Facebook account is connected.
          </p>
        </div>

        {!conversation.humanTakeover && (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-sm font-medium mb-2">Send as human (takes precedence over AI)</h2>
            <form action={sendHumanMessageAction} className="flex gap-2">
              <input type="hidden" name="conversationId" value={conversation.id} />
              <input name="text" dir="rtl" className="flex-1 border rounded px-3 py-1.5 text-sm" required />
              <button className="bg-brand-600 text-white rounded px-3 py-1.5 text-sm">Send</button>
            </form>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-4 text-xs space-y-1">
          <div><b>Stage:</b> {conversation.stage}</div>
          <div><b>Reply eligible:</b> {String(conversation.replyEligible)}</div>
          <div><b>Opt-out:</b> {String(conversation.optOut)}</div>
          <div><b>Window expires:</b> {conversation.messagingWindowExpiresAt?.toISOString() ?? "—"}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-medium mb-2">Internal notes</h2>
          <form action={addNoteAction} className="space-y-2 mb-3">
            <input type="hidden" name="conversationId" value={conversation.id} />
            <textarea name="note" className="w-full border rounded p-2 text-xs" rows={2} required />
            <button className="bg-gray-800 text-white rounded px-3 py-1 text-xs">Add note</button>
          </form>
          <ul className="text-xs space-y-1">
            {conversation.notes.map((n) => (
              <li key={n.id} className="border-t pt-1">
                <b>{n.authorName}:</b> {n.note}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
