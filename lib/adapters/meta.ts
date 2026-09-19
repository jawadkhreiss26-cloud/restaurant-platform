import crypto from "crypto";
import { config } from "../config";

/**
 * Meta (Instagram DM / Facebook Messenger) adapter interface.
 * docs/08-meta-messaging-architecture.md is the spec this implements.
 *
 * Only official Graph API / Messenger Platform primitives are modeled here.
 * No browser automation, no login bypass, ever.
 */

export interface SendMessageInput {
  platform: "INSTAGRAM" | "MESSENGER";
  recipientId: string;
  text: string;
}

export interface SendMessageResult {
  platformMessageId: string;
  status: "sent" | "failed";
  error?: string;
}

export interface MetaAdapter {
  isLive: boolean;
  canInitiateConversation(input: {
    lastCustomerMessageAt: Date | null;
    replyEligible: boolean;
  }): boolean;
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
}

const STANDARD_WINDOW_MS = 24 * 60 * 60 * 1000;

class MockMetaAdapter implements MetaAdapter {
  isLive = false;

  canInitiateConversation(input: { lastCustomerMessageAt: Date | null; replyEligible: boolean }) {
    if (!input.lastCustomerMessageAt) return false; // cold lead -> manual outreach queue
    const withinWindow = Date.now() - input.lastCustomerMessageAt.getTime() < STANDARD_WINDOW_MS;
    return input.replyEligible && withinWindow;
  }

  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    // Simulated success; in mock mode we never actually call any external
    // network endpoint.
    return {
      platformMessageId: `mock_${crypto.randomUUID()}`,
      status: "sent"
    };
  }

  verifyWebhookSignature(): boolean {
    // Mock mode accepts all local test payloads (there is no real secret).
    return true;
  }
}

class LiveMetaAdapter implements MetaAdapter {
  isLive = true;

  canInitiateConversation(input: { lastCustomerMessageAt: Date | null; replyEligible: boolean }) {
    if (!input.lastCustomerMessageAt) return false;
    const withinWindow = Date.now() - input.lastCustomerMessageAt.getTime() < STANDARD_WINDOW_MS;
    return input.replyEligible && withinWindow;
  }

  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const token =
      input.platform === "INSTAGRAM" ? config.meta.igAccessToken : config.meta.pageAccessToken;
    if (!token) {
      return { platformMessageId: "", status: "failed", error: "Missing Meta access token" };
    }
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: input.recipientId },
          message: { text: input.text }
        })
      });
      const json = await res.json();
      if (!res.ok) {
        return { platformMessageId: "", status: "failed", error: JSON.stringify(json) };
      }
      return { platformMessageId: json.message_id, status: "sent" };
    } catch (e: any) {
      return { platformMessageId: "", status: "failed", error: e.message };
    }
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!signatureHeader || !config.meta.appSecret) return false;
    const expected =
      "sha256=" + crypto.createHmac("sha256", config.meta.appSecret).update(rawBody).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
    } catch {
      return false;
    }
  }
}

export function getMetaAdapter(): MetaAdapter {
  return config.meta.isLive ? new LiveMetaAdapter() : new MockMetaAdapter();
}
