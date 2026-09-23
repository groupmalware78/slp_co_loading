import { z } from "zod";
import { registry, ErrorSchema, PaginationFields } from "../registry";

const CustomerSchema = registry.register(
  "Customer",
  z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    trn: z.string().nullable(),
    customerCode: z.string().nullable(),
    companyId: z.string(),
    createdAt: z.string().datetime(),
  })
);

registry.registerPath({
  method: "get",
  path: "/v1/customers",
  tags: ["Customers"],
  summary: "List/search customers for this company",
  security: [{ ApiKeyAuth: [] }],
  request: {
    query: z.object({
      q: z.string().optional().openapi({ description: "Matches name, email, or customer code." }),
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(5000).optional().default(25),
    }),
  },
  responses: {
    200: {
      description: "Matching customers, paginated.",
      content: { "application/json": { schema: z.object({ customers: z.array(CustomerSchema), ...PaginationFields }) } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/customers",
  tags: ["Customers"],
  summary: "Create a customer, or return the existing match",
  description:
    "Used by signup and the pre-alert flow's 'create the customer record if none exists yet' path. Returns the existing row (200-shaped body, 200 status) if one already matches companyId+email rather than erroring.",
  security: [{ ApiKeyAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string(),
            email: z.string().email(),
            phone: z.string().optional(),
            trn: z.string().optional(),
            assignCustomerCode: z.boolean().optional().openapi({
              description: "Only self-registration sets this — assigns a 'suite number' style code.",
            }),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "Created.", content: { "application/json": { schema: z.object({ customer: CustomerSchema }) } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/customers/{id}",
  tags: ["Customers"],
  summary: "Get one customer",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "The customer.", content: { "application/json": { schema: z.object({ customer: CustomerSchema }) } } },
    404: { description: "Not found.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/customers/by-email",
  tags: ["Customers"],
  summary: "Look up a customer by email",
  security: [{ ApiKeyAuth: [] }],
  request: { query: z.object({ email: z.string().email() }) },
  responses: {
    200: {
      description: "The matching customer, or null if none.",
      content: { "application/json": { schema: z.object({ customer: CustomerSchema.nullable() }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/customers/stats",
  tags: ["Customers"],
  summary: "Company-wide customer totals and top customers by shipment volume",
  security: [{ ApiKeyAuth: [] }],
  request: { query: z.object({ since: z.string().datetime().optional() }) },
  responses: {
    200: {
      description: "Aggregate customer stats.",
      content: {
        "application/json": {
          schema: z.object({
            total: z.number(),
            topCustomers: z.array(
              z.object({ id: z.string(), name: z.string(), email: z.string(), packageCount: z.number() })
            ),
            recentCreatedAt: z.array(z.string().datetime()),
          }),
        },
      },
    },
  },
});
