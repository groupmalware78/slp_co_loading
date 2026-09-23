-- AlterEnum
ALTER TYPE "PackageStatus" ADD VALUE 'PENDING';

-- DropForeignKey
ALTER TABLE "packages" DROP CONSTRAINT "packages_receivedById_fkey";

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "additionalDetails" TEXT,
ADD COLUMN     "merchantName" TEXT,
ALTER COLUMN "receivedById" DROP NOT NULL,
ALTER COLUMN "receivedAt" DROP NOT NULL,
ALTER COLUMN "receivedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
