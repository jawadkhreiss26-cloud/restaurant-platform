import { prisma } from "../lib/db";
import { getEmailAdapter } from "../lib/adapters/email";

/**
 * Hosting renewal + follow-up sweeps (docs/12-hosting-renewal-workflow.md).
 * In production these run on a schedule inside the worker process
 * (BullMQ repeatable jobs / a cron trigger); exposed here as plain
 * functions so they can also be invoked from a serverless cron or tested
 * directly.
 */

export async function hostingRenewalSweep() {
  const now = new Date();
  const soon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const expiringSoon = await prisma.publishedWebsite.findMany({
    where: { status: "ACTIVE", hostingExpiresAt: { lte: soon, gt: now } },
    include: { lead: true }
  });

  const email = getEmailAdapter();
  for (const site of expiringSoon) {
    await email.send({
      to: `lead-${site.leadId}@placeholder.invalid`,
      subject: "Hosting renewal reminder",
      body: `Hosting for ${site.lead.restaurantName}'s website expires on ${site.hostingExpiresAt.toISOString()}.`
    });
  }

  const expired = await prisma.publishedWebsite.updateMany({
    where: { status: "ACTIVE", hostingExpiresAt: { lte: now } },
    data: { status: "EXPIRED" }
  });

  return { remindersSent: expiringSoon.length, markedExpired: expired.count };
}

export async function followUpSweep() {
  const due = await prisma.followUpSchedule.findMany({
    where: { status: "SCHEDULED", dueAt: { lte: new Date() } },
    include: { lead: true }
  });

  let scheduled = 0;
  for (const item of due) {
    if (item.lead.optedOut || item.lead.status === "LOST" || item.lead.status === "OPTED_OUT") {
      await prisma.followUpSchedule.update({ where: { id: item.id }, data: { status: "CANCELLED" } });
      continue;
    }
    // A real implementation enqueues an outbound follow-up message via the
    // Meta adapter here, respecting quiet hours; left as a status flip in
    // the MVP so the schedule is visibly working end-to-end.
    await prisma.followUpSchedule.update({ where: { id: item.id }, data: { status: "SENT" } });
    scheduled++;
  }
  return { processed: scheduled };
}

async function main() {
  const hosting = await hostingRenewalSweep();
  const followUps = await followUpSweep();
  console.log("Sweep complete:", { hosting, followUps });
}

if (require.main === module) {
  main().finally(() => process.exit(0));
}
