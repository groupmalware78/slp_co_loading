-- CreateEnum
CREATE TYPE "FeeBasis" AS ENUM ('WEIGHT', 'VALUE');

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "calculatedFee" DOUBLE PRECISION,
ADD COLUMN     "calculatedFeeAt" TIMESTAMP(3),
ADD COLUMN     "calculatedFeeBasis" "FeeBasis",
ADD COLUMN     "declaredValue" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "fee_ranges" (
    "id" TEXT NOT NULL,
    "basis" "FeeBasis" NOT NULL,
    "label" TEXT NOT NULL,
    "min" DOUBLE PRECISION NOT NULL,
    "max" DOUBLE PRECISION,
    "fee" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "fee_ranges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fee_ranges_companyId_basis_idx" ON "fee_ranges"("companyId", "basis");

-- AddForeignKey
ALTER TABLE "fee_ranges" ADD CONSTRAINT "fee_ranges_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

