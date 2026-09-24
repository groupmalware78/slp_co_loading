import { z } from "zod";
import { registry, ErrorSchema, PortalUserSchema } from "../registry";

const PORTAL_ROLE_VALUES = ["ADMIN", "CSR", "CUSTOMER", "DRIVER", "LOGGER"] as const;

registry.registerPath({
  method: "get",
  path: "/v1/portal-users",
  tags: ["Portal Users"],
  summary: "List portal users for this company",
  description: "?role= filters to one role, e.g. excluding CUSTOMER self-registrations from a staff-management list.",
  security: [{ ApiKeyAuth: [] }],
  request: { query: z.object({ role: z.enum(PORTAL_ROLE_VALUES).optional() }) },
  responses: {
    200: { description: "Portal users.", content: { "application/json": { schema: z.object({ users: z.array(PortalUserSchema) }) } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/portal-users",
  tags: ["Portal Users"],
  summary: "Create a staff account (not customer self-registration)",
  description: "Generic staff-account creation (e.g. an admin creating a CSR/driver account). Customer self-registration goes through POST /v1/portal-users/signup instead.",
  security: [{ ApiKeyAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string(),
            email: z.string().email(),
            password: z.string().min(8),
            role: z.enum(PORTAL_ROLE_VALUES),
            mustChangePassword: z.boolean().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "Created.", content: { "application/json": { schema: z.object({ user: PortalUserSchema }) } } },
    409: { description: "An account with that email already exists.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/portal-users/{id}",
  tags: ["Portal Users"],
  summary: "Get one portal user",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "The user.", content: { "application/json": { schema: z.object({ user: PortalUserSchema }) } } },
    404: { description: "Not found.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/v1/portal-users/{id}",
  tags: ["Portal Users"],
  summary: "Update a portal user",
  description: "Field-set-driven — send only the fields the caller's own access control allows for the current session. Does not accept a password (see .../set-password and .../change-password).",
  security: [{ ApiKeyAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().optional(),
            email: z.string().email().optional(),
            role: z.enum(PORTAL_ROLE_VALUES).optional(),
            active: z.boolean().optional(),
            mustChangePassword: z.boolean().optional(),
            firstName: z.string().optional(),
            middleInitial: z.string().max(3).optional(),
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
    200: { description: "Updated.", content: { "application/json": { schema: z.object({ user: PortalUserSchema }) } } },
    404: { description: "Not found.", content: { "application/json": { schema: ErrorSchema } } },
    409: { description: "Email already in use.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/v1/portal-users/{id}",
  tags: ["Portal Users"],
  summary: "Delete a portal user",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Deleted.", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    404: { description: "Not found.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/portal-users/by-email",
  tags: ["Portal Users"],
  summary: "Look up a portal user by email",
  security: [{ ApiKeyAuth: [] }],
  request: { query: z.object({ email: z.string().email() }) },
  responses: {
    200: { description: "The matching user, or null.", content: { "application/json": { schema: z.object({ user: PortalUserSchema.nullable() }) } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/portal-users/{id}/change-password",
  tags: ["Portal Users"],
  summary: "Self-service password change (requires current password)",
  security: [{ ApiKeyAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: z.object({ currentPassword: z.string(), newPassword: z.string().min(8) }) } } },
  },
  responses: {
    200: { description: "Changed.", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    400: { description: "Current password is incorrect.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/portal-users/{id}/set-password",
  tags: ["Portal Users"],
  summary: "Trusted-caller password reset (no current-password check)",
  description: "Used after a password-reset token has already been validated, and by admin-initiated staff account resets.",
  security: [{ ApiKeyAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: z.object({ newPassword: z.string().min(8), clearMustChangePassword: z.boolean().optional() }) } } },
  },
  responses: {
    200: { description: "Set.", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/portal-users/signup",
  tags: ["Portal Users"],
  summary: "Customer self-registration",
  description: "The whole self-registration transaction in one call: creates the PortalUser, creates or links a matching Customer row, and issues (but does not send) an email-verification token. The caller owns sending the verification email.",
  security: [{ ApiKeyAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            firstName: z.string(),
            middleInitial: z.string().min(1).max(3),
            lastName: z.string(),
            email: z.string().email(),
            password: z.string().min(8),
            phone: z.string(),
            workPhone: z.string().optional(),
            addressLine1: z.string(),
            addressLine2: z.string().optional(),
            cityParish: z.string(),
            country: z.string(),
            trn: z.string(),
            storeLocation: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Account created.",
      content: {
        "application/json": {
          schema: z.object({ user: PortalUserSchema, customerCode: z.string().nullable(), emailVerificationToken: z.string() }),
        },
      },
    },
    409: { description: "An account with that email, or that TRN, already exists.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/portal-users/password-reset/request",
  tags: ["Portal Users"],
  summary: "Issue a password-reset token",
  description: "Returns { token: null } rather than an error when the email doesn't match an account, so the caller's response can stay the same either way (no account-existence enumeration).",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: z.object({ email: z.string().email() }) } } } },
  responses: {
    200: {
      description: "Token issued (or not, if no matching active account).",
      content: {
        "application/json": {
          schema: z.object({ token: z.string().nullable(), user: z.object({ id: z.string(), name: z.string(), email: z.string() }).optional() }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/portal-users/password-reset/consume",
  tags: ["Portal Users"],
  summary: "Redeem a password-reset token",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: z.object({ token: z.string(), newPassword: z.string().min(8) }) } } } },
  responses: {
    200: { description: "Password reset.", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    400: { description: "Invalid or expired token.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/portal-users/email-verification/issue",
  tags: ["Portal Users"],
  summary: "Issue a fresh email-verification token",
  description: "Used for 'resend verification'. Does not send the email — returns the token for the caller to build a link and send it.",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: z.object({ portalUserId: z.string() }) } } } },
  responses: {
    200: {
      description: "Token issued.",
      content: { "application/json": { schema: z.object({ token: z.string(), user: z.object({ id: z.string(), name: z.string(), email: z.string() }) }) } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/portal-users/email-verification/consume",
  tags: ["Portal Users"],
  summary: "Redeem an email-verification token",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: z.object({ token: z.string() }) } } } },
  responses: {
    200: { description: "Verified.", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    400: { description: "Invalid or expired token.", content: { "application/json": { schema: ErrorSchema } } },
  },
});
