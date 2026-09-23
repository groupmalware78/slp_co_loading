import { z } from "zod";
import { registry, ErrorSchema, PackageSchema, PaginationFields } from "../registry";

const PACKAGE_STATUS_VALUES = [
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
const PACKAGE_TYPE_VALUES = ["BOX", "BAG", "ENVELOPE", "OTHER"] as const;
const PAYMENT_STATUS_VALUES = ["UNPAID", "PARTIAL", "PAID"] as const;

registry.registerPath({
  method: "get",
  path: "/v1/packages",
  tags: ["Packages"],
  summary: "List/search packages for this company",
  description:
    "General-purpose list covering every kind of filter a client app needs: free-text search (q), exact status or a comma-separated status set (statusIn), a date range on receivedAt, one customer's packages (customerId), an exact tracking-number lookup (trackingNumber, also used for duplicate-pre-alert checks), or one driver's assigned packages (driverId).",
  security: [{ ApiKeyAuth: [] }],
  request: {
    query: z.object({
      q: z.string().optional(),
      status: z.enum(PACKAGE_STATUS_VALUES).optional(),
      statusIn: z.string().optional().openapi({ description: "Comma-separated status values." }),
      dateFrom: z.string().optional().openapi({ example: "2026-01-01" }),
      dateTo: z.string().optional().openapi({ example: "2026-01-31" }),
      customerId: z.string().optional(),
      trackingNumber: z.string().optional(),
      driverId: z.string().optional(),
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
    }),
  },
  responses: {
    200: {
      description: "Matching packages, paginated.",
      content: {
        "application/json": {
          schema: z.object({ packages: z.array(PackageSchema), ...PaginationFields }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/packages",
  tags: ["Packages"],
  summary: "Create a PENDING pre-alert package",
  description:
    "Used by a customer's own pre-alert flow (web or mobile). Multipart: the receipt/invoice file is required at creation and stored as bytes on this same row, since the package doesn't exist yet to attach a file to separately.",
  security: [{ ApiKeyAuth: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            trackingNumber: z.string(),
            pieces: z.coerce.number().int().positive(),
            packageType: z.enum(PACKAGE_TYPE_VALUES),
            description: z.string(),
            weightLbs: z.coerce.number().positive(),
            cost: z.coerce.number().min(0).optional(),
            additionalDetails: z.string().optional(),
            merchantName: z.string().optional(),
            customerId: z.string(),
            changedByLabel: z.string(),
            invoice: z.string().openapi({ type: "string", format: "binary" }),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Pre-alert created.",
      content: { "application/json": { schema: z.object({ package: PackageSchema }) } },
    },
    400: { description: "Invalid input, or unsupported/too-large invoice file.", content: { "application/json": { schema: ErrorSchema } } },
    409: { description: "A package with this tracking number already exists for this customer.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/packages/{id}",
  tags: ["Packages"],
  summary: "Get one package",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "The package.", content: { "application/json": { schema: z.object({ package: PackageSchema }) } } },
    404: { description: "Not found.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/v1/packages/{id}",
  tags: ["Packages"],
  summary: "Update a package (status, pricing, assignment, etc.)",
  description:
    "Field-set-driven, not role-driven: send only the fields the calling app's own access control allows for the current user — this endpoint applies no role logic of its own, it trusts the caller.",
  security: [{ ApiKeyAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            status: z.enum(PACKAGE_STATUS_VALUES).optional(),
            packageType: z.enum(PACKAGE_TYPE_VALUES).optional(),
            weightLbs: z.coerce.number().positive().optional().nullable(),
            pieces: z.coerce.number().int().positive().optional(),
            description: z.string().max(500).optional().nullable(),
            declaredValue: z.coerce.number().min(0).optional().nullable(),
            customerId: z.string().optional().nullable(),
            rate: z.coerce.number().min(0).optional().nullable(),
            cost: z.coerce.number().min(0).optional().nullable(),
            paymentStatus: z.enum(PAYMENT_STATUS_VALUES).optional(),
            amountPaid: z.coerce.number().min(0).optional().nullable(),
            changedByLabel: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Updated package.", content: { "application/json": { schema: z.object({ package: PackageSchema }) } } },
    404: { description: "Not found.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/packages/{id}/calculate-fee",
  tags: ["Packages"],
  summary: "Generate a fee for a package from a configured fee tier",
  description:
    "Matches the given weight or value against this company's FeeRange tiers for that basis and, if one matches, persists both the input value (onto weightLbs for WEIGHT, or declaredValue for VALUE) and the matched fee (calculatedFee/calculatedFeeBasis/calculatedFeeAt) on the package. Re-matches server-side — the fee amount in the response is never taken from the request.",
  security: [{ ApiKeyAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            basis: z.enum(["WEIGHT", "VALUE"]),
            value: z.coerce.number().positive(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Fee generated and applied.",
      content: { "application/json": { schema: z.object({ package: PackageSchema, matchedFeeRange: z.record(z.string(), z.unknown()) }) } },
    },
    400: { description: "No fee tier matches that value.", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/packages/{id}/invoice",
  tags: ["Packages"],
  summary: "Download the system-generated invoice PDF",
  description: "Streams generatedInvoicePdf bytes already stored on the package row.",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "The PDF.", content: { "application/pdf": { schema: z.string().openapi({ type: "string", format: "binary" }) } } },
    404: { description: "No invoice generated, or package not found.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/packages/{id}/status-events",
  tags: ["Packages"],
  summary: "Get a package's full status history",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "Status change history, most recent first.",
      content: {
        "application/json": {
          schema: z.object({
            events: z.array(
              z.object({
                id: z.string(),
                packageId: z.string(),
                fromStatus: z.string().nullable(),
                toStatus: z.string(),
                changedByLabel: z.string(),
                changedAt: z.string().datetime(),
              })
            ),
          }),
        },
      },
    },
    404: { description: "Package not found.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/packages/stats",
  tags: ["Packages"],
  summary: "Company-wide package counts and status breakdown",
  description: "Backs a reports page — whole-tenant aggregates the paginated list endpoint can't serve efficiently.",
  security: [{ ApiKeyAuth: [] }],
  request: { query: z.object({ since: z.string().datetime().optional().openapi({ description: "Bounds the createdAt timestamps returned for a volume chart." }) }) },
  responses: {
    200: {
      description: "Aggregate counts.",
      content: {
        "application/json": {
          schema: z.object({
            total: z.number(),
            today: z.number(),
            last7Days: z.number(),
            last30Days: z.number(),
            byStatus: z.record(z.string(), z.number()),
            recentCreatedAt: z.array(z.string().datetime()),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/packages/financial-stats",
  tags: ["Packages"],
  summary: "Raw priced-package rows for a financial report",
  description: "Returns every package with cost set; the caller computes totals/grouping itself.",
  security: [{ ApiKeyAuth: [] }],
  responses: {
    200: {
      description: "Priced packages.",
      content: {
        "application/json": {
          schema: z.object({
            packages: z.array(
              z.object({
                cost: z.number().nullable(),
                amountPaid: z.number().nullable(),
                paymentStatus: z.string(),
                customerId: z.string().nullable(),
                createdAt: z.string().datetime(),
                customer: z.object({ name: z.string(), email: z.string() }).nullable(),
              })
            ),
          }),
        },
      },
    },
  },
});
