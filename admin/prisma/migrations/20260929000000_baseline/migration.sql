-- Baseline: the full schema in one migration, generated with
--   prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
-- It replaces the earlier incremental history, which couldn't build a fresh
-- database: several portal tables (portal_settings, portal_users, …) were
-- originally created by customer-portal's hand-applied SQL, outside these
-- migrations. Those old migrations are in git history before this commit.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SCANNER', 'LOGGER', 'CSR');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('PENDING', 'RECEIVED', 'SHIPPED', 'AT_CUSTOMS', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DAMAGED', 'EMPTY_PACKAGE', 'RETURNED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('BOX', 'BAG', 'ENVELOPE', 'OTHER');

-- CreateEnum
CREATE TYPE "PortalRole" AS ENUM ('ADMIN', 'CSR', 'CUSTOMER', 'DRIVER', 'LOGGER');

-- CreateEnum
CREATE TYPE "FeeBasis" AS ENUM ('WEIGHT', 'VALUE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "AuditEntity" AS ENUM ('PACKAGE', 'COMPANY', 'CUSTOMER', 'USER', 'MANIFEST', 'PORTAL_INVOICE');

-- CreateEnum
CREATE TYPE "ApiKeyScope" AS ENUM ('FULL', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('RESEND', 'SMTP');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('REQUESTED', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SCANNER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" "AuditEntity" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedById" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "perPackageRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentDueDays" INTEGER,
    "portalFeeMonthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_bank_accounts" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "routingNumber" TEXT,
    "branch" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "apiKeyPrefix" TEXT NOT NULL,
    "apiKeyScope" "ApiKeyScope" NOT NULL DEFAULT 'FULL',
    "apiKeyRotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestsPerMinute" INTEGER NOT NULL DEFAULT 300,
    "hostingCostMonthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "trn" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_invoices" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "portalFeeAmount" DOUBLE PRECISION NOT NULL,
    "hostingCostAmount" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "invoicePdf" BYTEA,
    "invoiceFileName" TEXT,
    "invoiceGeneratedAt" TIMESTAMP(3),
    "invoiceDueDate" TIMESTAMP(3),
    "invoicePaidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_settings" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "logoEmoji" TEXT NOT NULL DEFAULT '📦',
    "logoUrl" TEXT,
    "logoImage" BYTEA,
    "logoImageFileName" TEXT,
    "faviconUrl" TEXT,
    "faviconImage" BYTEA,
    "faviconImageFileName" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#0f172a',
    "gradientFrom" TEXT NOT NULL DEFAULT '#1e1b4b',
    "gradientVia" TEXT NOT NULL DEFAULT '#581c87',
    "gradientTo" TEXT NOT NULL DEFAULT '#831843',
    "heroImageUrl" TEXT,
    "heroImage" BYTEA,
    "heroImageFileName" TEXT,
    "welcomeMessage" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "termsContent" TEXT,
    "privacyContent" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "manifestAutoGenerate" BOOLEAN NOT NULL DEFAULT false,
    "manifestTime" TEXT,
    "manifestDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "warehouseName" TEXT,
    "warehouseAddressLine1" TEXT,
    "warehouseAddressLine2" TEXT,
    "warehouseCity" TEXT,
    "warehouseState" TEXT,
    "warehouseZip" TEXT,
    "warehouseCountry" TEXT,
    "warehousePhone" TEXT,
    "bankName" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankRoutingNumber" TEXT,
    "bankBranch" TEXT,
    "emailProvider" "EmailProvider",
    "emailFromAddress" TEXT,
    "resendApiKeyEncrypted" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUsername" TEXT,
    "smtpPasswordEncrypted" TEXT,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "portal_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "trn" TEXT,
    "customerCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "hawb" SERIAL NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "status" "PackageStatus" NOT NULL DEFAULT 'RECEIVED',
    "packageType" "PackageType" NOT NULL DEFAULT 'BOX',
    "pieces" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "weightLbs" DOUBLE PRECISION,
    "rate" DOUBLE PRECISION,
    "cost" DOUBLE PRECISION,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "amountPaid" DOUBLE PRECISION DEFAULT 0,
    "description" TEXT,
    "declaredValue" DOUBLE PRECISION,
    "dutyImportDuty" DOUBLE PRECISION,
    "dutyStampDuty" DOUBLE PRECISION,
    "dutyAdditionalStampDuty" DOUBLE PRECISION,
    "dutyGct" DOUBLE PRECISION,
    "dutySct" DOUBLE PRECISION,
    "dutyStandardComplianceFee" DOUBLE PRECISION,
    "dutyEnvironmentalLevy" DOUBLE PRECISION,
    "dutyCustomsAdminFee" DOUBLE PRECISION,
    "calculatedFee" DOUBLE PRECISION,
    "calculatedFeeBasis" "FeeBasis",
    "calculatedFeeAt" TIMESTAMP(3),
    "invoiceUrl" TEXT,
    "invoiceImage" BYTEA,
    "invoiceFileName" TEXT,
    "invoiceUploadedAt" TIMESTAMP(3),
    "merchantName" TEXT,
    "additionalDetails" TEXT,
    "generatedInvoicePdf" BYTEA,
    "generatedInvoiceFileName" TEXT,
    "generatedInvoiceAt" TIMESTAMP(3),
    "receivedById" TEXT,
    "receivedAt" TIMESTAMP(3),
    "companyId" TEXT,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "portal_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "PortalRole" NOT NULL DEFAULT 'CUSTOMER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT,
    "middleInitial" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "workPhone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "cityParish" TEXT,
    "country" TEXT,
    "trn" TEXT,
    "storeLocation" TEXT,
    "termsAcceptedAt" TIMESTAMP(3),
    "avatarUrl" TEXT,
    "avatarImage" BYTEA,
    "avatarImageFileName" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "emailVerificationToken" TEXT,
    "emailVerificationExpires" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,

    CONSTRAINT "portal_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorized_pickup_people" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "relationship" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "portalUserId" TEXT NOT NULL,

    CONSTRAINT "authorized_pickup_people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_rates" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minWeightLbs" DOUBLE PRECISION NOT NULL,
    "maxWeightLbs" DOUBLE PRECISION,
    "price" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "shipping_rates_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "hoursMonFri" TEXT NOT NULL,
    "hoursSat" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_items" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "subheader" TEXT,
    "answer" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "faq_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manifests" (
    "id" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "packageCount" INTEGER NOT NULL,
    "packages" JSONB NOT NULL,
    "triggeredBy" TEXT NOT NULL DEFAULT 'MANUAL',
    "invoiceAmount" DOUBLE PRECISION,
    "invoicePdf" BYTEA,
    "invoiceFileName" TEXT,
    "invoiceGeneratedAt" TIMESTAMP(3),
    "invoiceDueDate" TIMESTAMP(3),
    "invoicePaidAt" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,

    CONSTRAINT "manifests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_assignments" (
    "id" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'REQUESTED',
    "notes" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "cityParish" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "proofPhoto" BYTEA,
    "proofSignature" BYTEA,
    "proofCapturedAt" TIMESTAMP(3),
    "packageId" TEXT NOT NULL,
    "driverId" TEXT,
    "requestedById" TEXT,

    CONSTRAINT "delivery_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_passwordResetToken_key" ON "users"("passwordResetToken");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "companies_apiKeyHash_key" ON "companies"("apiKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "companies_contactEmail_key" ON "companies"("contactEmail");

-- CreateIndex
CREATE UNIQUE INDEX "portal_invoices_companyId_period_key" ON "portal_invoices"("companyId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customerCode_key" ON "customers"("customerCode");

-- CreateIndex
CREATE UNIQUE INDEX "customers_companyId_email_key" ON "customers"("companyId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_companyId_trn_key" ON "customers"("companyId", "trn");

-- CreateIndex
CREATE UNIQUE INDEX "packages_hawb_key" ON "packages"("hawb");

-- CreateIndex
CREATE INDEX "packages_trackingNumber_idx" ON "packages"("trackingNumber");

-- CreateIndex
CREATE INDEX "packages_receivedAt_idx" ON "packages"("receivedAt");

-- CreateIndex
CREATE INDEX "package_status_events_packageId_idx" ON "package_status_events"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "portal_users_emailVerificationToken_key" ON "portal_users"("emailVerificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "portal_users_passwordResetToken_key" ON "portal_users"("passwordResetToken");

-- CreateIndex
CREATE UNIQUE INDEX "portal_users_companyId_email_key" ON "portal_users"("companyId", "email");

-- CreateIndex
CREATE INDEX "authorized_pickup_people_portalUserId_idx" ON "authorized_pickup_people"("portalUserId");

-- CreateIndex
CREATE INDEX "fee_ranges_companyId_basis_idx" ON "fee_ranges"("companyId", "basis");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_invoices" ADD CONSTRAINT "portal_invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_settings" ADD CONSTRAINT "portal_settings_id_fkey" FOREIGN KEY ("id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_status_events" ADD CONSTRAINT "package_status_events_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_users" ADD CONSTRAINT "portal_users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorized_pickup_people" ADD CONSTRAINT "authorized_pickup_people_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "portal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_ranges" ADD CONSTRAINT "fee_ranges_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faq_items" ADD CONSTRAINT "faq_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manifests" ADD CONSTRAINT "manifests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "portal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "portal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

