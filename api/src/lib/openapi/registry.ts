import { OpenAPIRegistry, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Must run before any `.openapi(...)` call on a Zod schema anywhere in
// this module tree.
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Every /v1/** route (except /v1/mobile/**, which layers a bearer JWT on
// top after login) is authenticated by this one header — see
// src/lib/internalAuth.ts. It doubles as the tenant identifier: whichever
// company the key belongs to is the company every request is scoped to.
registry.registerComponent("securitySchemes", "ApiKeyAuth", {
  type: "apiKey",
  in: "header",
  name: "x-api-key",
  description:
    "The company's API key, issued when the company is registered in the Service-Provider app (Companies → API Key). Identifies both who is calling and which company's data the call is scoped to.",
});

// /v1/mobile/** routes (other than login itself) additionally require
// this — the bearer token login returns, carrying the authenticated
// portal user's id/role/companyId.
registry.registerComponent("securitySchemes", "MobileBearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description:
    "Bearer token returned by POST /v1/mobile/auth/login. Required on every other /v1/mobile/** route.",
});

// ---- shared component schemas, reused across multiple paths ----------

export const ErrorSchema = registry.register(
  "Error",
  z.object({ error: z.string() }).openapi({ description: "Returned on any non-2xx response." })
);

export const CompanySummarySchema = registry.register(
  "CompanySummary",
  z.object({ id: z.string(), name: z.string(), code: z.string() })
);

export const CustomerSummarySchema = registry.register(
  "CustomerSummary",
  z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    customerCode: z.string().nullable(),
  })
);

export const PackageSchema = registry.register(
  "Package",
  z.object({
    id: z.string(),
    hawb: z.number(),
    trackingNumber: z.string(),
    status: z.string().openapi({
      example: "RECEIVED",
      description:
        "PENDING | RECEIVED | SHIPPED | AT_CUSTOMS | READY_FOR_PICKUP | OUT_FOR_DELIVERY | DELIVERED | DAMAGED | EMPTY_PACKAGE | RETURNED",
    }),
    packageType: z.string().openapi({ example: "BOX", description: "BOX | BAG | ENVELOPE | OTHER" }),
    pieces: z.number(),
    weightLbs: z.number().nullable(),
    description: z.string().nullable(),
    declaredValue: z.number().nullable(),
    cost: z.number().nullable(),
    paymentStatus: z.string().openapi({ example: "UNPAID", description: "UNPAID | PARTIAL | PAID" }),
    amountPaid: z.number().nullable(),
    calculatedFee: z.number().nullable(),
    calculatedFeeBasis: z.string().nullable().openapi({ example: "WEIGHT", description: "WEIGHT | VALUE | null" }),
    calculatedFeeAt: z.string().datetime().nullable(),
    merchantName: z.string().nullable(),
    additionalDetails: z.string().nullable(),
    invoiceFileName: z.string().nullable(),
    invoiceUploadedAt: z.string().datetime().nullable(),
    generatedInvoiceFileName: z.string().nullable(),
    generatedInvoiceAt: z.string().datetime().nullable(),
    receivedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    companyId: z.string(),
    customerId: z.string().nullable(),
    company: CompanySummarySchema.nullable(),
    customer: CustomerSummarySchema.nullable(),
  })
);

export const PortalUserSchema = registry.register(
  "PortalUser",
  z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.string().openapi({ example: "CUSTOMER", description: "ADMIN | CSR | CUSTOMER | DRIVER" }),
    active: z.boolean(),
    mustChangePassword: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    firstName: z.string().nullable(),
    middleInitial: z.string().nullable(),
    lastName: z.string().nullable(),
    phone: z.string().nullable(),
    workPhone: z.string().nullable(),
    addressLine1: z.string().nullable(),
    addressLine2: z.string().nullable(),
    cityParish: z.string().nullable(),
    country: z.string().nullable(),
    trn: z.string().nullable(),
    storeLocation: z.string().nullable(),
    emailVerified: z.boolean(),
    companyId: z.string(),
  })
);

export const DeliveryAssignmentSchema = registry.register(
  "DeliveryAssignment",
  z.object({
    id: z.string(),
    status: z.string().openapi({
      example: "REQUESTED",
      description: "REQUESTED | ASSIGNED | OUT_FOR_DELIVERY | DELIVERED | FAILED",
    }),
    notes: z.string().nullable(),
    assignedAt: z.string().datetime(),
    deliveredAt: z.string().datetime().nullable(),
    proofCapturedAt: z.string().datetime().nullable(),
    addressLine1: z.string(),
    addressLine2: z.string().nullable(),
    cityParish: z.string(),
    country: z.string(),
    packageId: z.string(),
    // Null while status is REQUESTED — no driver assigned yet.
    driverId: z.string().nullable(),
    requestedById: z.string().nullable(),
  })
);

export const PaginationFields = {
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
};
