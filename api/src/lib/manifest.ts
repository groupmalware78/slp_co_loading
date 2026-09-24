import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { recordPackageStatusEvent } from "./packageStatusHistory";
import { notifyPackageStatusChange } from "./packageStatusNotify";

export interface ManifestPackageSnapshot {
  trackingNumber: string;
  description: string | null;
  weightLbs: number | null;
  receivedAt: string;
  customerName: string | null;
}

// Ported from customer-portal/src/lib/manifest.ts when that app lost
// direct DB access — manifest generation is inherently transactional
// (snapshot + bulk status advance must never disagree), so it lives here
// as a single internal API call rather than several SDK round-trips.
//
// Snapshots every RECEIVED package for this tenant into a Manifest, then
// advances those packages to SHIPPED.
export async function generateManifest(triggeredBy: "SCHEDULE" | "MANUAL", companyId: string) {
  return prisma
    .$transaction(async (tx) => {
      const packages = await tx.package.findMany({
        where: { companyId, status: "RECEIVED" },
        orderBy: { receivedAt: "asc" },
        select: {
          id: true,
          hawb: true,
          trackingNumber: true,
          description: true,
          packageType: true,
          pieces: true,
          weightLbs: true,
          cost: true,
          paymentStatus: true,
          amountPaid: true,
          calculatedFee: true,
          calculatedFeeBasis: true,
          declaredValue: true,
          dutyImportDuty: true,
          dutyStampDuty: true,
          dutyAdditionalStampDuty: true,
          dutyGct: true,
          dutySct: true,
          dutyStandardComplianceFee: true,
          dutyEnvironmentalLevy: true,
          dutyCustomsAdminFee: true,
          receivedAt: true,
          companyId: true,
          customer: { select: { name: true, email: true, customerCode: true } },
        },
      });

      const snapshot: ManifestPackageSnapshot[] = packages.map((p) => ({
        trackingNumber: p.trackingNumber,
        description: p.description,
        weightLbs: p.weightLbs,
        // Non-null: this snapshot only ever queries status "RECEIVED"
        // packages, which always have receivedAt set (it's set at the same
        // moment status becomes RECEIVED — see POST /api/packages).
        receivedAt: p.receivedAt!.toISOString(),
        customerName: p.customer?.name ?? null,
      }));

      const manifest = await tx.manifest.create({
        data: {
          companyId,
          packageCount: snapshot.length,
          packages: snapshot as unknown as Prisma.InputJsonValue,
          triggeredBy,
        },
      });

      if (packages.length > 0) {
        await tx.package.updateMany({
          where: { id: { in: packages.map((p) => p.id) } },
          data: { status: "SHIPPED" },
        });

        const changedByLabel = triggeredBy === "SCHEDULE" ? "System — Scheduled manifest" : "System — Manual manifest";
        for (const p of packages) {
          await recordPackageStatusEvent(
            { packageId: p.id, fromStatus: "RECEIVED", toStatus: "SHIPPED", changedByLabel },
            tx
          );
        }
      }

      return { manifest, packages };
    })
    .then(async ({ manifest, packages }) => {
      // Fired after the transaction commits — email/PDF I/O shouldn't hold
      // a DB transaction open, and a failed send shouldn't roll back the
      // manifest itself (notifyPackageStatusChange already swallows
      // errors).
      await Promise.all(packages.map((p) => notifyPackageStatusChange(p, "SHIPPED")));
      return manifest;
    });
}
