-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('BOX', 'BAG', 'ENVELOPE', 'OTHER');

-- AlterTable
ALTER TABLE "packages" ADD COLUMN "packageType" "PackageType" NOT NULL DEFAULT 'BOX';
