import { z } from "zod";

export const DEFAULT_PACKAGES_PAGE_SIZE = 15;

export const PACKAGE_STATUS_VALUES = [
  "PENDING",
  "RECEIVED",
  "SHIPPED",
  "AT_CUSTOMS",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DAMAGED",
  "EMPTY_PACKAGE",
  "RETURNED",
] as const;

export const PAYMENT_STATUS_VALUES = ["UNPAID", "PARTIAL", "PAID"] as const;

export const PACKAGE_TYPE_VALUES = ["BOX", "BAG", "ENVELOPE", "OTHER"] as const;

export const PACKAGE_TYPE_LABELS: Record<(typeof PACKAGE_TYPE_VALUES)[number], string> = {
  BOX: "Box",
  BAG: "Bag",
  ENVELOPE: "Envelope",
  OTHER: "Other",
};

export const SORTABLE_PACKAGE_FIELDS = [
  "trackingNumber",
  "company",
  "receivedBy",
  "receivedAt",
  "status",
  "updatedAt",
] as const;
export type SortablePackageField = (typeof SORTABLE_PACKAGE_FIELDS)[number];

export const packageDetailsSchema = z.object({
  trackingNumber: z.string().trim().min(1, "Tracking number is required").max(100),
  status: z.enum(PACKAGE_STATUS_VALUES).default("RECEIVED"),
  packageType: z.enum(PACKAGE_TYPE_VALUES).default("BOX"),
  pieces: z.coerce.number().int().positive("Pieces must be at least 1").default(1),
  notes: z.string().trim().max(500).optional(),
  companyId: z.string().trim().min(1).optional().nullable(),
  customerId: z.string().trim().min(1).optional().nullable(),
  weightLbs: z.coerce.number().positive("Weight must be greater than 0").optional().nullable(),
  description: z.string().trim().max(500).optional(),
  merchantName: z.string().trim().max(150).optional(),
  additionalDetails: z.string().trim().max(500).optional(),
  paymentStatus: z.enum(PAYMENT_STATUS_VALUES).default("UNPAID"),
  amountPaid: z.coerce.number().min(0, "Amount paid must be 0 or more").optional().nullable(),
});

export const packageInclude = {
  receivedBy: { select: { id: true, name: true, role: true } },
  company: { select: { id: true, name: true, code: true } },
  customer: { select: { id: true, name: true, email: true, customerCode: true } },
} as const;
