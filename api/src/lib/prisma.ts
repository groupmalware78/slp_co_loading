import { PrismaClient } from "@prisma/client";

// Generated invoices, customer-uploaded receipts, delivery proof-of-
// delivery images, and branding/avatar images are all stored as raw bytes
// — excluded by default so they aren't silently pulled into every
// list/detail fetch. The dedicated download/view routes (including
// internal/files/**) opt back in with an explicit select.
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    omit: {
      package: {
        generatedInvoicePdf: true,
        invoiceImage: true,
      },
      deliveryAssignment: {
        proofPhoto: true,
        proofSignature: true,
      },
      portalSettings: {
        logoImage: true,
        faviconImage: true,
        heroImage: true,
      },
      portalUser: {
        avatarImage: true,
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
