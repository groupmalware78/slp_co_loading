-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "customerCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "customers_customerCode_key" ON "customers"("customerCode");
