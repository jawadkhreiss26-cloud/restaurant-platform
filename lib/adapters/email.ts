import { prisma } from "../db";

export interface EmailAdapter {
  send(input: { to: string; subject: string; body: string }): Promise<void>;
}

class MockEmailAdapter implements EmailAdapter {
  async send(input: { to: string; subject: string; body: string }) {
    await prisma.emailLog.create({ data: input });
  }
}

export function getEmailAdapter(): EmailAdapter {
  return new MockEmailAdapter();
}
