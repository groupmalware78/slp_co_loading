import type { PackageStatus, PackageType, PaymentStatus, Role } from "@prisma/client";

export interface PackageWithRelations {
  id: string;
  hawb: number;
  trackingNumber: string;
  status: PackageStatus;
  packageType: PackageType;
  pieces: number;
  notes: string | null;
  weightLbs: number | null;
  cost: number | null;
  paymentStatus: PaymentStatus;
  amountPaid: number | null;
  description: string | null;
  invoiceUrl: string | null;
  invoiceFileName: string | null;
  invoiceUploadedAt: string | null;
  merchantName: string | null;
  additionalDetails: string | null;
  generatedInvoiceFileName: string | null;
  generatedInvoiceAt: string | null;
  // Null only while status is PENDING (a customer-created pre-alert not
  // yet matched to a real warehouse log-in).
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  receivedBy: {
    id: string;
    name: string;
    role: Role;
  } | null;
  company: {
    id: string;
    name: string;
    code: string;
  } | null;
  customer: {
    id: string;
    name: string;
    email: string;
    customerCode: string | null;
  } | null;
}
