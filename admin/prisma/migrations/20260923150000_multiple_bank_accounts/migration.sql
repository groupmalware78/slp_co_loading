-- AlterTable
ALTER TABLE "platform_settings" DROP COLUMN "bankAccountName",
DROP COLUMN "bankAccountNumber",
DROP COLUMN "bankBranch",
DROP COLUMN "bankName",
DROP COLUMN "bankRoutingNumber";

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

