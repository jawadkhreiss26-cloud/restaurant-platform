# Payment Workflow

1. AI/human asks permission ("أرسل لك رابط الدفع؟"). Only on explicit yes does
   `create_payment_link` run, using `PricingConfig` (standard price unless a
   valid, authorized discount was recorded for this lead).
2. `payments.createPaymentLink()` (mock provider by default; adapter interface
   supports plugging a real Iraqi-compatible processor or manual bank/e-wallet
   transfer instructions) returns a `PaymentLink{url, expiresAt}`; stage →
   `PAYMENT_LINK_SENT`.
3. Customer pays (or sends transfer confirmation). Two verification paths:
   - **Webhook**: provider calls back → signature verified → idempotency key
     checked → `Payment.status = PAID` automatically.
   - **Manual**: Finance Reviewer/Admin reviews evidence (bank ref, wallet
     screenshot as a *lead*, never as sole proof) in Payments → Verification
     and clicks **Verify** — this is the only way a screenshot can result in
     `PAID`; the tool explicitly will not auto-confirm from an image.
4. On `PAID`, stage advances, a receipt (`receiptUrl`) is generated, and CRM
   moves to `CORRECTIONS_PENDING`.
5. Refunds/disputes are Finance/Owner/Admin-only actions, always logged, and
   always trigger `ESCALATED` on the lead for review.
6. Status enum exactly matches spec §17: NOT_REQUESTED, LINK_SENT, PENDING,
   VERIFICATION_REQUIRED, PAID, FAILED, REFUNDED, DISPUTED.
7. The system and the AI never ask for passwords, PINs, OTPs, full card
   numbers, or wallet credentials — enforced both in the persona guardrails
   and in the payment-link template copy itself.
