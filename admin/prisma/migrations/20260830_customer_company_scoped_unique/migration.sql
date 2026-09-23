ALTER TABLE "customers" ADD COLUMN "trn" TEXT;
DROP INDEX "customers_email_key";
CREATE UNIQUE INDEX "customers_companyId_email_key" ON "customers"("companyId", "email");
CREATE UNIQUE INDEX "customers_companyId_trn_key" ON "customers"("companyId", "trn");
