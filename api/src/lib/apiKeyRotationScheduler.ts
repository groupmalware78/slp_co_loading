import { prisma } from "./prisma";
import { rotateApiKey } from "./apiKeyRotation";
import { deliverRotationWebhook } from "./apiKeyRotationWebhook";

// Mirrors customer-portal/src/lib/manifestScheduler.ts's setInterval +
// globalThis de-dupe pattern, but hourly (day-granularity rotation config
// doesn't need finer polling) and scanning every company — api/ serves
// every tenant, unlike that per-deployment scheduler.
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

let lastRunHourKey: string | null = null;

async function tick() {
  const hourKey = new Date().toISOString().slice(0, 13);
  if (lastRunHourKey === hourKey) return;
  lastRunHourKey = hourKey;

  try {
    // The companies table is small (a handful of tenants) — filtering in
    // JS rather than a date-arithmetic WHERE is cheap here; revisit with
    // raw SQL if that assumption stops holding.
    const candidates = await prisma.company.findMany({
      where: { active: true, apiKeyRotationDays: { gt: 0 } },
      select: {
        id: true,
        apiKeyRotatedAt: true,
        apiKeyRotationDays: true,
        apiKeyWebhookUrl: true,
        apiKeyWebhookSecret: true,
      },
    });

    const now = Date.now();
    for (const c of candidates) {
      const dueAt = c.apiKeyRotatedAt.getTime() + c.apiKeyRotationDays * 24 * 60 * 60 * 1000;
      if (now < dueAt) continue;

      const { rawKey, company, eventId } = await rotateApiKey(c.id, {
        trigger: "AUTOMATIC",
        gracePeriodHours: 48,
      });
      console.log(`[apiKeyRotation] auto-rotated key for company ${c.id}`);

      if (c.apiKeyWebhookUrl && c.apiKeyWebhookSecret) {
        const { delivered, attempts } = await deliverRotationWebhook({
          url: c.apiKeyWebhookUrl,
          secret: c.apiKeyWebhookSecret,
          companyId: c.id,
          apiKey: rawKey,
          rotatedAt: company.apiKeyRotatedAt,
          gracePeriodEndsAt: company.apiKeyPreviousExpiresAt,
        });
        await prisma.apiKeyRotationEvent.update({
          where: { id: eventId },
          data: {
            webhookDeliveredAt: delivered ? new Date() : undefined,
            webhookAttempts: { increment: attempts },
          },
        });
      }
    }
  } catch (err) {
    console.error("[apiKeyRotation] scheduler tick failed:", err);
  }
}

const globalForScheduler = globalThis as unknown as {
  apiKeyRotationSchedulerStarted?: boolean;
};

export function startApiKeyRotationScheduler() {
  if (globalForScheduler.apiKeyRotationSchedulerStarted) return;
  globalForScheduler.apiKeyRotationSchedulerStarted = true;
  setInterval(tick, CHECK_INTERVAL_MS);
  tick();
  console.log("[apiKeyRotation] scheduler started, checking hourly");
}
