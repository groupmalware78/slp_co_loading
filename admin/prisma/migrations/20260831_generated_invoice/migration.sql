ALTER TABLE "packages"
  ADD COLUMN "generatedInvoiceUrl" TEXT,
  ADD COLUMN "generatedInvoiceFileName" TEXT,
  ADD COLUMN "generatedInvoiceAt" TIMESTAMP(3);

-- Superseded within the same migration batch: the generated invoice is
-- stored as bytes rather than a /uploads/ file path, since either app
-- (two separate deployments, two separate filesystems) can be the one
-- that generates it.
ALTER TABLE "packages" DROP COLUMN "generatedInvoiceUrl";
ALTER TABLE "packages" ADD COLUMN "generatedInvoicePdf" BYTEA;
