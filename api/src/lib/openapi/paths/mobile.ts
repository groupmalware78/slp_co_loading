import { z } from "zod";
import { registry, ErrorSchema, PackageSchema, DeliveryAssignmentSchema, PaginationFields } from "../registry";

// The mobile app (driver + customer roles only) authenticates every call
// after login with the bearer token login returns — see
// src/lib/mobileAuth.ts. Login itself is the one mobile route still keyed
// by the company's x-api-key, since there's no user session yet to derive
// company scope from.
const MobileUserSchema = z.object({ id: z.string(), name: z.string(), email: z.string(), role: z.string() });

registry.registerPath({
  method: "post",
  path: "/v1/mobile/auth/login",
  tags: ["Mobile"],
  summary: "Mobile app login (driver or customer)",
  description: "Verifies credentials for this company (via x-api-key) and, if the account is a DRIVER or CUSTOMER with mustChangePassword already cleared, returns a 30-day bearer JWT for every other /v1/mobile/** route.",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: z.object({ email: z.string().email(), password: z.string() }) } } } },
  responses: {
    200: { description: "Login succeeded.", content: { "application/json": { schema: z.object({ token: z.string(), user: MobileUserSchema }) } } },
    401: { description: "Invalid email or password.", content: { "application/json": { schema: ErrorSchema } } },
    403: { description: "Not a driver/customer account, or must change password on the web portal first.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/mobile/me",
  tags: ["Mobile"],
  summary: "Get the signed-in mobile user's profile",
  security: [{ MobileBearerAuth: [] }],
  responses: {
    200: {
      description: "The user.",
      content: {
        "application/json": {
          schema: z.object({
            user: MobileUserSchema.extend({
              firstName: z.string().nullable(),
              lastName: z.string().nullable(),
              phone: z.string().nullable(),
              addressLine1: z.string().nullable(),
              addressLine2: z.string().nullable(),
              cityParish: z.string().nullable(),
              country: z.string().nullable(),
              trn: z.string().nullable(),
              storeLocation: z.string().nullable(),
              emailVerified: z.boolean(),
            }),
          }),
        },
      },
    },
    401: { description: "Missing/invalid/expired token.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/v1/mobile/profile",
  tags: ["Mobile"],
  summary: "Update the signed-in mobile user's profile",
  security: [{ MobileBearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().optional(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            phone: z.string().optional(),
            storeLocation: z.string().optional().nullable(),
            addressLine1: z.string().optional(),
            addressLine2: z.string().optional().nullable(),
            cityParish: z.string().optional(),
            country: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Updated.", content: { "application/json": { schema: z.object({ user: MobileUserSchema }) } } },
    403: { description: "Email not verified yet (for customer personal-info/address edits).", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/mobile/profile/password",
  tags: ["Mobile"],
  summary: "Change the signed-in mobile user's password",
  security: [{ MobileBearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: z.object({ currentPassword: z.string(), newPassword: z.string().min(8) }) } } } },
  responses: {
    200: { description: "Changed.", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    400: { description: "Current password is incorrect.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/mobile/profile/authorized-pickup",
  tags: ["Mobile"],
  summary: "List the signed-in customer's authorized pickup people",
  security: [{ MobileBearerAuth: [] }],
  responses: { 200: { description: "People.", content: { "application/json": { schema: z.object({ people: z.array(z.object({ id: z.string(), name: z.string(), phone: z.string().nullable(), relationship: z.string().nullable() })) }) } } } },
});

registry.registerPath({
  method: "post",
  path: "/v1/mobile/profile/authorized-pickup",
  tags: ["Mobile"],
  summary: "Add an authorized pickup person",
  security: [{ MobileBearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: z.object({ name: z.string(), phone: z.string().optional(), relationship: z.string().optional() }) } } } },
  responses: { 201: { description: "Created.", content: { "application/json": { schema: z.object({ person: z.object({ id: z.string(), name: z.string() }) }) } } } },
});

registry.registerPath({
  method: "delete",
  path: "/v1/mobile/profile/authorized-pickup/{id}",
  tags: ["Mobile"],
  summary: "Remove an authorized pickup person",
  security: [{ MobileBearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: "Removed.", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } } },
});

registry.registerPath({
  method: "get",
  path: "/v1/mobile/shipments",
  tags: ["Mobile"],
  summary: "List the signed-in customer's shipments",
  security: [{ MobileBearerAuth: [] }],
  request: { query: z.object({ status: z.string().optional(), page: z.coerce.number().int().min(1).optional().default(1) }) },
  responses: { 200: { description: "Shipments, paginated.", content: { "application/json": { schema: z.object({ shipments: z.array(PackageSchema), ...PaginationFields }) } } } },
});

registry.registerPath({
  method: "get",
  path: "/v1/mobile/shipments/{id}",
  tags: ["Mobile"],
  summary: "Get one of the signed-in customer's shipments",
  security: [{ MobileBearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "The shipment.", content: { "application/json": { schema: z.object({ shipment: PackageSchema }) } } },
    404: { description: "Not found (or not this customer's).", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/mobile/shipments/{id}/invoice",
  tags: ["Mobile"],
  summary: "Download the system-generated invoice for one of the signed-in customer's shipments",
  security: [{ MobileBearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "The PDF.", content: { "application/pdf": { schema: z.string().openapi({ type: "string", format: "binary" }) } } },
    404: { description: "No invoice generated (or not this customer's).", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/mobile/shipments/{id}/delivery",
  tags: ["Mobile"],
  summary: "Get the latest delivery request/assignment for one of the signed-in customer's shipments",
  description: "The most recently created delivery row for this shipment (REQUESTED/ASSIGNED/OUT_FOR_DELIVERY/DELIVERED/FAILED), or null if delivery has never been requested for it.",
  security: [{ MobileBearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "The delivery, or null.", content: { "application/json": { schema: z.object({ delivery: DeliveryAssignmentSchema.nullable() }) } } },
    404: { description: "Shipment not found (or not this customer's).", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/mobile/pre-alert",
  tags: ["Mobile"],
  summary: "Submit a pre-alert for an incoming shipment",
  description: "Requires a verified email. Multipart: the receipt/invoice file is required at submission.",
  security: [{ MobileBearerAuth: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            trackingNumber: z.string(),
            pieces: z.coerce.number().int().positive(),
            packageType: z.enum(["BOX", "BAG", "ENVELOPE", "OTHER"]),
            description: z.string(),
            weightLbs: z.coerce.number().positive(),
            cost: z.coerce.number().min(0).optional(),
            additionalDetails: z.string().optional(),
            merchantName: z.string().optional(),
            invoice: z.string().openapi({ type: "string", format: "binary" }),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "Pre-alert created.", content: { "application/json": { schema: z.object({ shipment: PackageSchema }) } } },
    403: { description: "Email not verified yet.", content: { "application/json": { schema: ErrorSchema } } },
    409: { description: "A shipment with this tracking number already exists.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/mobile/deliveries",
  tags: ["Mobile"],
  summary: "List the signed-in driver's delivery assignments",
  security: [{ MobileBearerAuth: [] }],
  request: { query: z.object({ status: z.enum(["ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"]).optional(), page: z.coerce.number().int().min(1).optional().default(1) }) },
  responses: { 200: { description: "Assignments, paginated.", content: { "application/json": { schema: z.object({ deliveries: z.array(DeliveryAssignmentSchema), ...PaginationFields }) } } } },
});

registry.registerPath({
  method: "post",
  path: "/v1/mobile/deliveries",
  tags: ["Mobile"],
  summary: "Request home delivery for one of the signed-in customer's shipments",
  description: "Creates a REQUESTED delivery assignment with no driver yet — staff assign one from the web Service-Provider/CSR side. Fails if the package is already DELIVERED or already has an active (REQUESTED/ASSIGNED/OUT_FOR_DELIVERY) delivery.",
  security: [{ MobileBearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            packageId: z.string(),
            addressLine1: z.string(),
            addressLine2: z.string().optional(),
            cityParish: z.string(),
            country: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "Requested.", content: { "application/json": { schema: z.object({ delivery: DeliveryAssignmentSchema }) } } },
    400: { description: "Already delivered, or invalid input.", content: { "application/json": { schema: ErrorSchema } } },
    409: { description: "A delivery has already been requested for this package.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/mobile/deliveries/{id}",
  tags: ["Mobile"],
  summary: "Get one delivery assignment (the signed-in driver's own, or the signed-in customer's own request)",
  security: [{ MobileBearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "The assignment.", content: { "application/json": { schema: z.object({ delivery: DeliveryAssignmentSchema }) } } },
    404: { description: "Not found (or not this driver's/customer's).", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/v1/mobile/deliveries/{id}",
  tags: ["Mobile"],
  summary: "Update a delivery's status (driver) or delivery address (customer)",
  description: "A DRIVER may send status (non-terminal transitions only — DELIVERED goes through POST .../complete instead, since it requires proof) and notes, for their own assignment. A CUSTOMER may send the address fields only, for their own request, and only while it's still REQUESTED or ASSIGNED. Sending fields outside a role's allowance is rejected.",
  security: [{ MobileBearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            status: z.enum(["OUT_FOR_DELIVERY", "FAILED"]).optional(),
            notes: z.string().max(500).optional(),
            addressLine1: z.string().optional(),
            addressLine2: z.string().nullable().optional(),
            cityParish: z.string().optional(),
            country: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Updated.", content: { "application/json": { schema: z.object({ delivery: DeliveryAssignmentSchema }) } } },
    400: { description: "This delivery can no longer be edited.", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found (or not this driver's/customer's).", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/mobile/deliveries/{id}/complete",
  tags: ["Mobile"],
  summary: "Complete a delivery with proof (signature + optional photo)",
  security: [{ MobileBearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            signature: z.string().openapi({ type: "string", format: "binary" }),
            photo: z.string().openapi({ type: "string", format: "binary" }).optional(),
            notes: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Completed.", content: { "application/json": { schema: z.object({ delivery: DeliveryAssignmentSchema }) } } },
    403: { description: "This delivery isn't assigned to you.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/mobile/deliveries/{id}/proof",
  tags: ["Mobile"],
  summary: "Download the captured proof-of-delivery signature or photo",
  description: "Available to the assigned driver or the owning customer.",
  security: [{ MobileBearerAuth: [] }],
  request: { params: z.object({ id: z.string() }), query: z.object({ type: z.enum(["signature", "photo"]).optional().default("signature") }) },
  responses: {
    200: { description: "Image bytes.", content: { "image/png": { schema: z.string().openapi({ type: "string", format: "binary" }) } } },
    403: { description: "Not your delivery.", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "No proof captured, or not found.", content: { "application/json": { schema: ErrorSchema } } },
  },
});
