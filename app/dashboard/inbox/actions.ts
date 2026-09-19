"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { assertCan } from "@/lib/core/authz";
import { getMetaAdapter } from "@/lib/adapters/meta";
import { processInboundMessage } from "@/lib/core/aiTurn";
import { logAudit } from "@/lib/audit";

export async function simulateInboundAction(formData: FormData) {
  await requireSession();
  const conversationId = String(formData.get("conversationId"));
  const text = String(formData.get("text"));
  await processInboundMessage(conversationId, text);
  revalidatePath(`/dashboard/inbox/${conversationId}`);
}

export async function sendHumanMessageAction(formData: FormData) {
  const session = await requireSession();
  assertCan(session.role, "inbox:reply");
  const conversationId = String(formData.get("conversationId"));
  const text = String(formData.get("text"));

  const conversation = await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  const meta = getMetaAdapter();
  const result = await meta.sendMessage({ platform: conversation.platform, recipientId: conversation.recipientId ?? "", text });

  await prisma.message.create({
    data: {
      conversationId,
      direction: "outbound",
      text,
      aiGenerated: false,
      approvedByUserId: session.id,
      platformMessageId: result.platformMessageId,
      deliveryStatus: result.status
    }
  });

  revalidatePath(`/dashboard/inbox/${conversationId}`);
}

export async function toggleTakeoverAction(formData: FormData) {
  const session = await requireSession();
  assertCan(session.role, "takeover:toggle");
  const conversationId = String(formData.get("conversationId"));
  const conversation = await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      humanTakeover: !conversation.humanTakeover,
      assignedUserId: !conversation.humanTakeover ? session.id : null
    }
  });

  await logAudit({
    actorId: session.id,
    actorType: "user",
    action: conversation.humanTakeover ? "inbox.release_takeover" : "inbox.human_takeover",
    entityType: "Conversation",
    entityId: conversationId
  });

  revalidatePath(`/dashboard/inbox/${conversationId}`);
}

export async function toggleAiPauseAction(formData: FormData) {
  const session = await requireSession();
  assertCan(session.role, "ai:pause");
  const conversationId = String(formData.get("conversationId"));
  const conversation = await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  await prisma.conversation.update({ where: { id: conversationId }, data: { aiPaused: !conversation.aiPaused } });
  revalidatePath(`/dashboard/inbox/${conversationId}`);
}

export async function addNoteAction(formData: FormData) {
  const session = await requireSession();
  const conversationId = String(formData.get("conversationId"));
  const note = String(formData.get("note"));
  await prisma.conversationNote.create({ data: { conversationId, authorName: session.name, note } });
  revalidatePath(`/dashboard/inbox/${conversationId}`);
}

export async function toggleGlobalAiPauseAction() {
  const session = await requireSession();
  assertCan(session.role, "ai:pause");
  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } });
  await prisma.settings.update({ where: { id: "singleton" }, data: { globalAiPause: !settings.globalAiPause } });
  revalidatePath("/dashboard/inbox");
}
