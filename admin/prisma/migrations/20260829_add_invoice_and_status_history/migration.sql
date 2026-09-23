-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "invoiceFileName" TEXT,
ADD COLUMN     "invoiceUploadedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceUrl" TEXT;

-- CreateTable
CREATE TABLE "package_status_events" (
    "id" TEXT NOT NULL,
    "fromStatus" "PackageStatus",
    "toStatus" "PackageStatus" NOT NULL,
    "changedByLabel" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "packageId" TEXT NOT NULL,

    CONSTRAINT "package_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "package_status_events_packageId_idx" ON "package_status_events"("packageId");

-- AddForeignKey
ALTER TABLE "package_status_events" ADD CONSTRAINT "package_status_events_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
