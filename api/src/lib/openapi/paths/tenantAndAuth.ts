import { z } from "zod";
import { registry, ErrorSchema } from "../registry";

registry.registerPath({
  method: "get",
  path: "/v1/tenant/resolve",
  tags: ["Tenant"],
  summary: "Resolve the company an API key belongs to",
  description:
    "The primitive every client-app deployment uses on startup to identify which company it is, and to confirm the key is valid and the company is active.",
  security: [{ ApiKeyAuth: [] }],
  responses: {
    200: {
      description: "The company this API key resolves to.",
      content: { "application/json": { schema: z.object({ companyId: z.string() }) } },
    },
    401: { description: "Missing or invalid API key.", content: { "application/json": { schema: ErrorSchema } } },
    403: { description: "Company deactivated.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/auth/login",
  tags: ["Auth"],
  summary: "Verify staff/customer credentials for this company",
  description:
    "A single generic 'verify these credentials for this tenant' primitive. Does not itself check role or mustChangePassword — callers (a web app's own session login, or /v1/mobile/auth/login) apply their own business rules on top of this shared verification.",
  security: [{ ApiKeyAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ email: z.string().email(), password: z.string() }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Credentials verified.",
      content: {
        "application/json": {
          schema: z.object({
            user: z.object({
              id: z.string(),
              name: z.string(),
              email: z.string(),
              role: z.string(),
              active: z.boolean(),
              mustChangePassword: z.boolean(),
              emailVerified: z.boolean(),
              companyId: z.string(),
            }),
          }),
        },
      },
    },
    401: {
      description: "Invalid email or password.",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});
