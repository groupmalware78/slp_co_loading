import { z } from "zod";
import { registry, ErrorSchema, DeliveryAssignmentSchema, PaginationFields } from "../registry";

// ---- manifests ---------------------------------------------------------

const ManifestSchema = registry.register(
  "Manifest",
  z.object({
    id: z.string(),
    generatedAt: z.string().datetime(),
    packageCount: z.number(),
    packages: z.array(
      z.object({
        trackingNumber: z.string(),
        description: z.string().nullable(),
        weightLbs: z.number().nullable(),
        receivedAt: z.string().datetime(),
        customerName: z.string().nullable(),
      })
    ),
    triggeredBy: z.string().openapi({ example: "MANUAL", description: "MANUAL | SCHEDULE" }),
    companyId: z.string(),
  })
);

registry.registerPath({
  method: "get",
  path: "/v1/manifests",
  tags: ["Manifests"],
  summary: "List manifests for this company",
  security: [{ ApiKeyAuth: [] }],
  request: { query: z.object({ page: z.coerce.number().int().min(1).optional().default(1), pageSize: z.coerce.number().int().min(1).max(200).optional().default(20) }) },
  responses: { 200: { description: "Manifests, paginated.", content: { "application/json": { schema: z.object({ manifests: z.array(ManifestSchema), ...PaginationFields }) } } } },
});

registry.registerPath({
  method: "post",
  path: "/v1/manifests/generate",
  tags: ["Manifests"],
  summary: "Generate a manifest now",
  description: "Snapshots every currently-RECEIVED package for this company into a new manifest and advances them to SHIPPED, transactionally. Also sends the customer status-change notification/invoice email for each package, after the transaction commits.",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: z.object({ triggeredBy: z.enum(["MANUAL", "SCHEDULE"]).optional() }) } } } },
  responses: { 201: { description: "Manifest generated.", content: { "application/json": { schema: z.object({ manifest: ManifestSchema }) } } } },
});

// ---- delivery assignments ------------------------------------------------

registry.registerPath({
  method: "get",
  path: "/v1/delivery-assignments",
  tags: ["Delivery Assignments"],
  summary: "List delivery assignments for this company",
  description: "?driverId= scopes to one driver's own assignments; ?requestedById= scopes to one customer's own requests; omit both for an all-deliveries view. Company scoping always applies via the package relation.",
  security: [{ ApiKeyAuth: [] }],
  request: {
    query: z.object({
      driverId: z.string().optional(),
      packageId: z.string().optional(),
      requestedById: z.string().optional(),
      status: z.enum(["REQUESTED", "ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"]).optional(),
      page: z.coerce.number().int().min(1).optional().default(1),
    }),
  },
  responses: { 200: { description: "Assignments, paginated.", content: { "application/json": { schema: z.object({ deliveries: z.array(DeliveryAssignmentSchema), ...PaginationFields }) } } } },
});

registry.registerPath({
  method: "post",
  path: "/v1/delivery-assignments",
  tags: ["Delivery Assignments"],
  summary: "Request home delivery for a package, or assign it to a driver directly",
  description: "driverId is optional — a customer requesting delivery (requestedById set, no driverId) creates a REQUESTED row for staff to later assign; staff assigning directly pass driverId and the row starts as ASSIGNED.",
  security: [{ ApiKeyAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            packageId: z.string(),
            driverId: z.string().optional(),
            requestedById: z.string().optional(),
            addressLine1: z.string(),
            addressLine2: z.string().optional(),
            cityParish: z.string(),
            country: z.string(),
          }),
        },
      },
    },
  },
  responses: { 201: { description: "Created.", content: { "application/json": { schema: z.object({ delivery: DeliveryAssignmentSchema }) } } } },
});

registry.registerPath({
  method: "get",
  path: "/v1/delivery-assignments/{id}",
  tags: ["Delivery Assignments"],
  summary: "Get one delivery assignment",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "The assignment.", content: { "application/json": { schema: z.object({ delivery: DeliveryAssignmentSchema }) } } },
    404: { description: "Not found.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/v1/delivery-assignments/{id}",
  tags: ["Delivery Assignments"],
  summary: "Update a delivery assignment's status, driver, or delivery address",
  description: "Field-set-driven like the other PATCH endpoints — the caller applies its own RBAC (e.g. 'a driver may only update their own assignment', 'only ADMIN/CSR may set driverId') before calling this. Setting driverId on a REQUESTED assignment auto-advances status to ASSIGNED unless status is also explicitly sent. DELIVERED normally goes through .../complete instead (requires proof); this still accepts it for an admin-driven status edit that doesn't capture proof.",
  security: [{ ApiKeyAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            status: z.enum(["REQUESTED", "ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"]).optional(),
            driverId: z.string().nullable().optional(),
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
    404: { description: "Not found.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/delivery-assignments/{id}/complete",
  tags: ["Delivery Assignments"],
  summary: "Complete a delivery with proof (signature + optional photo)",
  description: "Marks the assignment DELIVERED and stores proof of delivery in one call — a signature (required) and optionally a photo, submitted together rather than a status update followed by a separate upload.",
  security: [{ ApiKeyAuth: [] }],
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
    400: { description: "Missing/oversized signature or photo.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/delivery-assignments/{id}/proof",
  tags: ["Delivery Assignments"],
  summary: "Download the captured proof-of-delivery signature or photo",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }), query: z.object({ type: z.enum(["signature", "photo"]).optional().default("signature") }) },
  responses: {
    200: { description: "Image bytes.", content: { "image/png": { schema: z.string().openapi({ type: "string", format: "binary" }) } } },
    404: { description: "No proof captured, or not found.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

// ---- authorized pickups ----------------------------------------------

const AuthorizedPickupPersonSchema = registry.register(
  "AuthorizedPickupPerson",
  z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string().nullable(),
    relationship: z.string().nullable(),
    createdAt: z.string().datetime(),
    portalUserId: z.string(),
  })
);

registry.registerPath({
  method: "get",
  path: "/v1/authorized-pickups",
  tags: ["Authorized Pickups"],
  summary: "List a customer's authorized pickup people",
  security: [{ ApiKeyAuth: [] }],
  request: { query: z.object({ portalUserId: z.string() }) },
  responses: { 200: { description: "Authorized pickup people.", content: { "application/json": { schema: z.object({ people: z.array(AuthorizedPickupPersonSchema) }) } } } },
});

registry.registerPath({
  method: "post",
  path: "/v1/authorized-pickups",
  tags: ["Authorized Pickups"],
  summary: "Add an authorized pickup person",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: z.object({ portalUserId: z.string(), name: z.string(), phone: z.string().optional(), relationship: z.string().optional() }) } } } },
  responses: { 201: { description: "Created.", content: { "application/json": { schema: z.object({ person: AuthorizedPickupPersonSchema }) } } } },
});

registry.registerPath({
  method: "delete",
  path: "/v1/authorized-pickups/{id}",
  tags: ["Authorized Pickups"],
  summary: "Remove an authorized pickup person",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }), query: z.object({ portalUserId: z.string() }) },
  responses: {
    200: { description: "Deleted.", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    404: { description: "Not found (or portalUserId doesn't own it).", content: { "application/json": { schema: ErrorSchema } } },
  },
});
