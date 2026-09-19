import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMetaAdapter } from "@/lib/adapters/meta";
import { config } from "@/lib/config";
import { processInboundMessage } from "@/lib/core/aiTurn";

/**
 * Meta webhook endpoint (docs/08-meta-messaging-architecture.md).
 * GET handles the platform verification handshake; POST receives inbound
 * message events. Signature is verified before anything is trusted.
 */

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === config.meta.webhookVerifyToken) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const meta = getMetaAdapter();

  if (meta.isLive && !meta.verifyWebhookSignature(rawBody, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  // Real Meta payloads are nested under entry[].messaging[]; this MVP also
  // accepts a flat { conversationId, text } shape so the mock adapter and
  // local testing can drive the same pipeline without a real Meta account.
  try {
    if (payload.conversationId && payload.text) {
      await processInboundMessage(payload.conversationId, payload.text);
    } else {
      for (const entry of payload.entry ?? []) {
        for (const evt of entry.messaging ?? []) {
          const recipientId = evt.sender?.id;
          const text = evt.message?.text;
          if (!recipientId || !text) continue;
          const conversation = await prisma.conversation.findFirst({ where: { recipientId } });
          if (conversation) {
            await processInboundMessage(conversation.id, text);
          }
        }
      }
    }
  } catch (e) {
    // Never let a processing error surface Meta's retry into a loop of
    // 5xxs; log and acknowledge receipt per Meta's requirements.
    console.error("Meta webhook processing error", e);
  }

  // Meta requires a fast 200 regardless of downstream processing outcome.
  return NextResponse.json({ received: true });
}
