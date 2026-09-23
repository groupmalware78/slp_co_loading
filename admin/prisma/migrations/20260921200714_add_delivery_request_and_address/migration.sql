-- AlterEnum
ALTER TYPE "DeliveryStatus" ADD VALUE 'REQUESTED';

-- DropForeignKey
ALTER TABLE "delivery_assignments" DROP CONSTRAINT "delivery_assignments_driverId_fkey";

-- AlterTable: add address columns nullable first (backfilled below), since
-- the table already has rows and a bare NOT NULL ADD COLUMN would fail.
ALTER TABLE "delivery_assignments" ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "cityParish" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "requestedById" TEXT,
ALTER COLUMN "status" SET DEFAULT 'REQUESTED',
ALTER COLUMN "driverId" DROP NOT NULL;

-- Backfill pre-existing rows (test/demo fixture data only, verified via
-- direct query before writing this migration) with a placeholder address.
UPDATE "delivery_assignments"
SET "addressLine1" = 'Unknown', "cityParish" = 'Unknown', "country" = 'Unknown'
WHERE "addressLine1" IS NULL;

-- Now that every row has a value, enforce NOT NULL as the schema declares.
ALTER TABLE "delivery_assignments" ALTER COLUMN "addressLine1" SET NOT NULL,
ALTER COLUMN "cityParish" SET NOT NULL,
ALTER COLUMN "country" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "portal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "portal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
