import crypto from "crypto";
import { config } from "../config";

/**
 * Payment adapter interface (docs/10-payment-workflow.md). No single
 * provider is hard-coded: the mock/manual-transfer implementation is always
 * available and is a legitimate default for the Iraqi market, not just a
 * placeholder.
 */

export interface CreatePaymentLinkInput {
  leadId: string;
  amountUsdCents: number;
  purpose: "setup" | "renewal" | "custom_domain";
  idempotencyKey: string;
}

export interface CreatePaymentLinkResult {
  url: string;
  externalRef: string;
  expiresAt: Date;
}

export interface PaymentsAdapter {
  isLive: boolean;
  createPaymentLink(input: CreatePaymentLinkInput): Promise<CreatePaymentLinkResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
}

class MockPaymentsAdapter implements PaymentsAdapter {
  isLive = false;

  async createPaymentLink(input: CreatePaymentLinkInput): Promise<CreatePaymentLinkResult> {
    const ref = `mock_pay_${crypto.randomUUID()}`;
    return {
      url: `${config.baseUrl}/pay/${ref}`,
      externalRef: ref,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
    };
  }

  verifyWebhookSignature(): boolean {
    return true;
  }
}

class LivePaymentsAdapter implements PaymentsAdapter {
  isLive = true;

  async createPaymentLink(input: CreatePaymentLinkInput): Promise<CreatePaymentLinkResult> {
    // Placeholder for a real provider integration (e.g. a card processor or
    // a local Iraqi payment gateway). Kept behind the same interface so
    // swapping providers never touches calling code.
    throw new Error(
      "Live payments provider not configured. Set PAYMENTS_PROVIDER_API_KEY and implement the provider call."
    );
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!signatureHeader || !config.payments.apiKey) return false;
    const expected = crypto.createHmac("sha256", config.payments.apiKey).update(rawBody).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
    } catch {
      return false;
    }
  }
}

export function getPaymentsAdapter(): PaymentsAdapter {
  return config.payments.isLive ? new LivePaymentsAdapter() : new MockPaymentsAdapter();
}
