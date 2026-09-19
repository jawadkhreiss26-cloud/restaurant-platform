/**
 * Worker entry point. In production this process would connect to Redis
 * (BullMQ) and consume: ProcessInboundMessage, AiTurn, GeneratePreview,
 * SendOutreach, HostingRenewalSweep (repeatable), FollowUpSweep
 * (repeatable). For the MVP — no Redis dependency required to demo the
 * platform — inbound-message processing runs inline from the API/webhook
 * route (see lib/core/aiTurn.ts), and this entry point simply runs the
 * periodic sweeps once per invocation; wire it to a scheduler (cron,
 * Cloud Scheduler, etc.) in staging/production.
 */
import { hostingRenewalSweep, followUpSweep } from "./sweeps";

async function main() {
  console.log("Running periodic sweeps...");
  const hosting = await hostingRenewalSweep();
  const followUps = await followUpSweep();
  console.log("Done:", { hosting, followUps });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
