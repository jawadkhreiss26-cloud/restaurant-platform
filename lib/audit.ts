import { prisma } from "./db";

export async function logAudit(input: {
  actorId?: string | null;
  actorType: "user" | "ai" | "system";
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorType: input.actorType,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        before: input.before !== undefined ? JSON.stringify(input.before) : null,
        after: input.after !== undefined ? JSON.stringify(input.after) : null
      }
    });
  } catch {
    // Audit logging must never break the primary operation.
  }
}
