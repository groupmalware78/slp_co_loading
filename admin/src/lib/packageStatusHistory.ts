import type { Prisma, PackageStatus } from "@prisma/client";
import { prisma } from "./prisma";

// Called whenever a package is created or its status changes. Optionally
// takes a transaction client so callers inside a $transaction (manifest
// generation) can include this write atomically.
export async function recordPackageStatusEvent(
  params: {
    packageId: string;
    fromStatus: PackageStatus | null;
    toStatus: PackageStatus;
    changedByLabel: string;
  },
  tx: Prisma.TransactionClient | typeof prisma = prisma
) {
  if (params.fromStatus === params.toStatus) return;
  await tx.packageStatusEvent.create({
    data: {
      packageId: params.packageId,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      changedByLabel: params.changedByLabel,
    },
  });
}
