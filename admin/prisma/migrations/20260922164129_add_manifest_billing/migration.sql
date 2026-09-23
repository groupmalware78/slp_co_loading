-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "perPackageRate" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "manifests" ADD COLUMN     "invoiceAmount" DOUBLE PRECISION,
ADD COLUMN     "invoiceFileName" TEXT,
ADD COLUMN     "invoiceGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "invoicePdf" BYTEA;

