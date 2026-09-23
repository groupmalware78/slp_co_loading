-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "hawb" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "packages_hawb_key" ON "packages"("hawb");
