-- DropIndex
DROP INDEX "customers_name_key";

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "companyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "companies_contactEmail_key" ON "companies"("contactEmail");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
