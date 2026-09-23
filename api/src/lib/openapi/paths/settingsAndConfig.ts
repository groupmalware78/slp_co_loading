import { z } from "zod";
import { registry, ErrorSchema } from "../registry";

// ---- portal settings ---------------------------------------------------

const PortalSettingsSchema = registry.register(
  "PortalSettings",
  z.object({
    id: z.string(),
    companyName: z.string(),
    logoEmoji: z.string(),
    logoImageFileName: z.string().nullable(),
    faviconImageFileName: z.string().nullable(),
    heroImageFileName: z.string().nullable(),
    primaryColor: z.string(),
    gradientFrom: z.string(),
    gradientVia: z.string(),
    gradientTo: z.string(),
    welcomeMessage: z.string().nullable(),
    contactEmail: z.string().nullable(),
    contactPhone: z.string().nullable(),
    manifestAutoGenerate: z.boolean(),
    manifestTime: z.string().nullable(),
    manifestDays: z.array(z.string()),
    warehouseName: z.string().nullable(),
    warehouseAddressLine1: z.string().nullable(),
    warehouseAddressLine2: z.string().nullable(),
    warehouseCity: z.string().nullable(),
    warehouseState: z.string().nullable(),
    warehouseZip: z.string().nullable(),
    warehouseCountry: z.string().nullable(),
    warehousePhone: z.string().nullable(),
    bankName: z.string().nullable(),
    bankAccountName: z.string().nullable(),
    bankAccountNumber: z.string().nullable(),
    bankRoutingNumber: z.string().nullable(),
    bankBranch: z.string().nullable(),
    updatedAt: z.string().datetime(),
  })
);

registry.registerPath({
  method: "get",
  path: "/v1/portal-settings/{companyId}",
  tags: ["Portal Settings"],
  summary: "Get this company's branding/CMS settings",
  description: "companyId in the path must match the API key's own company — this exists so a client app can pass its own resolved companyId through consistently, not to look up another company's settings.",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ companyId: z.string() }) },
  responses: {
    200: { description: "Settings (may be null if never configured).", content: { "application/json": { schema: z.object({ settings: PortalSettingsSchema.nullable() }) } } },
    403: { description: "companyId does not match the API key.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/v1/portal-settings/{companyId}",
  tags: ["Portal Settings"],
  summary: "Update branding/CMS/banking/warehouse/manifest-schedule settings",
  description: "One broad partial-update endpoint covering branding, contact info, the manifest auto-generation schedule, warehouse address, and banking details — send only the fields you own. Logo/favicon/hero image bytes are set via the /v1/files endpoints instead, not here.",
  security: [{ ApiKeyAuth: [] }],
  request: {
    params: z.object({ companyId: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            companyName: z.string().optional(),
            logoEmoji: z.string().optional(),
            primaryColor: z.string().optional(),
            gradientFrom: z.string().optional(),
            gradientVia: z.string().optional(),
            gradientTo: z.string().optional(),
            welcomeMessage: z.string().optional().nullable(),
            contactEmail: z.string().email().optional().nullable(),
            contactPhone: z.string().optional().nullable(),
            manifestAutoGenerate: z.boolean().optional(),
            manifestTime: z.string().optional().nullable(),
            manifestDays: z.array(z.string()).optional(),
            warehouseName: z.string().optional().nullable(),
            warehouseAddressLine1: z.string().optional().nullable(),
            warehouseAddressLine2: z.string().optional().nullable(),
            warehouseCity: z.string().optional().nullable(),
            warehouseState: z.string().optional().nullable(),
            warehouseZip: z.string().optional().nullable(),
            warehouseCountry: z.string().optional().nullable(),
            warehousePhone: z.string().optional().nullable(),
            bankName: z.string().optional().nullable(),
            bankAccountName: z.string().optional().nullable(),
            bankAccountNumber: z.string().optional().nullable(),
            bankRoutingNumber: z.string().optional().nullable(),
            bankBranch: z.string().optional().nullable(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Updated settings.", content: { "application/json": { schema: z.object({ settings: PortalSettingsSchema }) } } },
  },
});

// ---- shipping rates ------------------------------------------------------

const ShippingRateSchema = registry.register(
  "ShippingRate",
  z.object({
    id: z.string(),
    label: z.string(),
    minWeightLbs: z.number(),
    maxWeightLbs: z.number().nullable(),
    price: z.number(),
    sortOrder: z.number(),
    companyId: z.string(),
  })
);

const rateBodySchema = z.object({
  label: z.string(),
  minWeightLbs: z.coerce.number().min(0),
  maxWeightLbs: z.coerce.number().min(0).optional().nullable(),
  price: z.coerce.number().min(0),
  sortOrder: z.coerce.number().int().optional(),
});

registry.registerPath({
  method: "get",
  path: "/v1/shipping-rates",
  tags: ["Shipping Rates"],
  summary: "List weight-based shipping rates for this company",
  security: [{ ApiKeyAuth: [] }],
  responses: { 200: { description: "Rates.", content: { "application/json": { schema: z.object({ rates: z.array(ShippingRateSchema) }) } } } },
});

registry.registerPath({
  method: "post",
  path: "/v1/shipping-rates",
  tags: ["Shipping Rates"],
  summary: "Create a shipping rate tier",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: rateBodySchema } } } },
  responses: { 201: { description: "Created.", content: { "application/json": { schema: z.object({ rate: ShippingRateSchema }) } } } },
});

registry.registerPath({
  method: "patch",
  path: "/v1/shipping-rates/{id}",
  tags: ["Shipping Rates"],
  summary: "Update a shipping rate tier",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }), body: { content: { "application/json": { schema: rateBodySchema } } } },
  responses: {
    200: { description: "Updated.", content: { "application/json": { schema: z.object({ rate: ShippingRateSchema }) } } },
    404: { description: "Not found.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/v1/shipping-rates/{id}",
  tags: ["Shipping Rates"],
  summary: "Delete a shipping rate tier",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: "Deleted.", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } } },
});

// ---- fee ranges ------------------------------------------------------------

const FeeRangeSchema = registry.register(
  "FeeRange",
  z.object({
    id: z.string(),
    basis: z.enum(["WEIGHT", "VALUE"]),
    label: z.string(),
    min: z.number(),
    max: z.number().nullable(),
    fee: z.number(),
    sortOrder: z.number(),
    companyId: z.string(),
  })
);

const feeRangeBodySchema = z.object({
  basis: z.enum(["WEIGHT", "VALUE"]),
  label: z.string(),
  min: z.coerce.number().min(0),
  max: z.coerce.number().min(0).optional().nullable(),
  fee: z.coerce.number().min(0),
  sortOrder: z.coerce.number().int().optional(),
});

registry.registerPath({
  method: "get",
  path: "/v1/fee-ranges",
  tags: ["Fee Ranges"],
  summary: "List fee tiers for this company",
  description: "Admin-configured fee tiers used by the fee calculator — one table for both bases, filterable by basis.",
  security: [{ ApiKeyAuth: [] }],
  request: { query: z.object({ basis: z.enum(["WEIGHT", "VALUE"]).optional() }) },
  responses: { 200: { description: "Fee ranges.", content: { "application/json": { schema: z.object({ feeRanges: z.array(FeeRangeSchema) }) } } } },
});

registry.registerPath({
  method: "post",
  path: "/v1/fee-ranges",
  tags: ["Fee Ranges"],
  summary: "Create a fee tier",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: feeRangeBodySchema } } } },
  responses: { 201: { description: "Created.", content: { "application/json": { schema: z.object({ feeRange: FeeRangeSchema }) } } } },
});

registry.registerPath({
  method: "patch",
  path: "/v1/fee-ranges/{id}",
  tags: ["Fee Ranges"],
  summary: "Update a fee tier",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }), body: { content: { "application/json": { schema: feeRangeBodySchema } } } },
  responses: {
    200: { description: "Updated.", content: { "application/json": { schema: z.object({ feeRange: FeeRangeSchema }) } } },
    404: { description: "Not found.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/v1/fee-ranges/{id}",
  tags: ["Fee Ranges"],
  summary: "Delete a fee tier",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: "Deleted.", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } } },
});

// ---- locations -----------------------------------------------------------

const LocationSchema = registry.register(
  "Location",
  z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    contactNumber: z.string(),
    hoursMonFri: z.string(),
    hoursSat: z.string(),
    active: z.boolean(),
    sortOrder: z.number(),
    companyId: z.string(),
  })
);

const locationBodySchema = z.object({
  name: z.string(),
  address: z.string(),
  contactNumber: z.string(),
  hoursMonFri: z.string(),
  hoursSat: z.string(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

registry.registerPath({
  method: "get",
  path: "/v1/locations",
  tags: ["Locations"],
  summary: "List branch locations for this company",
  security: [{ ApiKeyAuth: [] }],
  request: { query: z.object({ activeOnly: z.coerce.boolean().optional() }) },
  responses: { 200: { description: "Locations.", content: { "application/json": { schema: z.object({ locations: z.array(LocationSchema) }) } } } },
});

registry.registerPath({
  method: "post",
  path: "/v1/locations",
  tags: ["Locations"],
  summary: "Create a branch location",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: locationBodySchema } } } },
  responses: { 201: { description: "Created.", content: { "application/json": { schema: z.object({ location: LocationSchema }) } } } },
});

registry.registerPath({
  method: "patch",
  path: "/v1/locations/{id}",
  tags: ["Locations"],
  summary: "Update a branch location",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }), body: { content: { "application/json": { schema: locationBodySchema } } } },
  responses: {
    200: { description: "Updated.", content: { "application/json": { schema: z.object({ location: LocationSchema }) } } },
    404: { description: "Not found.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/v1/locations/{id}",
  tags: ["Locations"],
  summary: "Delete a branch location",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: "Deleted.", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } } },
});

// ---- FAQs ------------------------------------------------------------

const FaqSchema = registry.register(
  "FaqItem",
  z.object({
    id: z.string(),
    question: z.string(),
    subheader: z.string().nullable(),
    answer: z.string(),
    active: z.boolean(),
    sortOrder: z.number(),
    companyId: z.string(),
  })
);

const faqBodySchema = z.object({
  question: z.string(),
  subheader: z.string().optional().nullable(),
  answer: z.string(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

registry.registerPath({
  method: "get",
  path: "/v1/faqs",
  tags: ["FAQs"],
  summary: "List FAQ items for this company",
  security: [{ ApiKeyAuth: [] }],
  request: { query: z.object({ activeOnly: z.coerce.boolean().optional() }) },
  responses: { 200: { description: "FAQs.", content: { "application/json": { schema: z.object({ faqs: z.array(FaqSchema) }) } } } },
});

registry.registerPath({
  method: "post",
  path: "/v1/faqs",
  tags: ["FAQs"],
  summary: "Create an FAQ item",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: faqBodySchema } } } },
  responses: { 201: { description: "Created.", content: { "application/json": { schema: z.object({ faq: FaqSchema }) } } } },
});

registry.registerPath({
  method: "patch",
  path: "/v1/faqs/{id}",
  tags: ["FAQs"],
  summary: "Update an FAQ item",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }), body: { content: { "application/json": { schema: faqBodySchema } } } },
  responses: {
    200: { description: "Updated.", content: { "application/json": { schema: z.object({ faq: FaqSchema }) } } },
    404: { description: "Not found.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/v1/faqs/{id}",
  tags: ["FAQs"],
  summary: "Delete an FAQ item",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: "Deleted.", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } } },
});
