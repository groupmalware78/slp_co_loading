-- AlterEnum
BEGIN;
CREATE TYPE "PackageStatus_new" AS ENUM ('RECEIVED', 'DAMAGED', 'EMPTY_PACKAGE', 'RETURNED');
ALTER TABLE "public"."packages" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "packages" ALTER COLUMN "status" TYPE "PackageStatus_new" USING ("status"::text::"PackageStatus_new");
ALTER TYPE "PackageStatus" RENAME TO "PackageStatus_old";
ALTER TYPE "PackageStatus_new" RENAME TO "PackageStatus";
DROP TYPE "public"."PackageStatus_old";
ALTER TABLE "packages" ALTER COLUMN "status" SET DEFAULT 'RECEIVED';
COMMIT;

-- DropForeignKey
ALTER TABLE "packages" DROP CONSTRAINT "packages_locationId_fkey";

-- AlterTable
ALTER TABLE "packages" DROP COLUMN "locationId";

-- DropTable
DROP TABLE "warehouse_locations";
