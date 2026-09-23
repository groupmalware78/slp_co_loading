import type { ApiKeyRotationTrigger } from "@prisma/client";
import { prisma } from "./prisma";
import { generateApiKey, hashApiKey, apiKeyPreview } from "./apiKeyHash";

// Mirrored verbatim in ../../api/src/lib/apiKeyRotation.ts (using that
// app's own prisma import) — no shared package exists in this repo.
//
// Backs all three rotation triggers with one code path, differing only in
// gracePeriodHours: ADMIN_MANUAL (Service-Provider staff revoking a leaked
// key) passes 0 for a hard cutover; PORTAL_MANUAL and AUTOMATIC pass 48 so
// already-running processes have time to pick up the new key before the
// old one stops authenticating.
export async function rotateApiKey(
  companyId: string,
  opts: { trigger: ApiKeyRotationTrigger; gracePeriodHours: number }
) {
  const rawKey = generateApiKey();
  const apiKeyHash = hashApiKey(rawKey);
  const apiKeyPrefix = apiKeyPreview(rawKey);

  const current = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { apiKeyHash: true },
  });

  const gracePeriodEndsAt =
    opts.gracePeriodHours > 0
      ? new Date(Date.now() + opts.gracePeriodHours * 60 * 60 * 1000)
      : null;

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      apiKeyHash,
      apiKeyPrefix,
      apiKeyPreviousHash: opts.gracePeriodHours > 0 ? current.apiKeyHash : null,
      apiKeyPreviousExpiresAt: gracePeriodEndsAt,
      apiKeyRotatedAt: new Date(),
    },
  });

  const event = await prisma.apiKeyRotationEvent.create({
    data: { companyId, trigger: opts.trigger, gracePeriodEndsAt },
  });

  // eventId lets a caller (e.g. apiKeyRotationScheduler's webhook delivery
  // tracking) update this exact row afterward — matching by rotatedAt
  // instead would be flaky, since the event's DB-side @default(now()) and
  // company.apiKeyRotatedAt's JS-side new Date() are computed a few
  // milliseconds apart and rarely compare equal.
  return { rawKey, company, eventId: event.id };
}
