import { z } from "zod";
import { registry, ErrorSchema } from "../registry";

const uploadBody = z.object({ file: z.string().openapi({ type: "string", format: "binary" }) });
const fileNameResponse = z.object({ fileName: z.string() });
const successResponse = z.object({ success: z.literal(true) });
const binaryResponse = z.string().openapi({ type: "string", format: "binary" });

function registerImageSlot(opts: {
  pathParam: "companyId" | "id";
  basePath: string;
  tag: string;
  slotName: string;
  allowedTypes: string;
  maxSize: string;
}) {
  const { pathParam, basePath, tag, slotName, allowedTypes, maxSize } = opts;
  const params = z.object({ [pathParam]: z.string() });

  registry.registerPath({
    method: "get",
    path: basePath,
    tags: [tag],
    summary: `Download the ${slotName}`,
    security: [{ ApiKeyAuth: [] }],
    request: { params },
    responses: {
      200: { description: "Image bytes.", content: { "image/*": { schema: binaryResponse } } },
      404: { description: `No ${slotName} uploaded.`, content: { "application/json": { schema: ErrorSchema } } },
    },
  });

  registry.registerPath({
    method: "post",
    path: basePath,
    tags: [tag],
    summary: `Upload the ${slotName}`,
    description: `Accepts ${allowedTypes}, up to ${maxSize}. Replaces the existing image, if any.`,
    security: [{ ApiKeyAuth: [] }],
    request: { params, body: { content: { "multipart/form-data": { schema: uploadBody } } } },
    responses: {
      200: { description: "Uploaded.", content: { "application/json": { schema: fileNameResponse } } },
      400: { description: "Unsupported type or too large.", content: { "application/json": { schema: ErrorSchema } } },
    },
  });

  registry.registerPath({
    method: "delete",
    path: basePath,
    tags: [tag],
    summary: `Remove the ${slotName}`,
    security: [{ ApiKeyAuth: [] }],
    request: { params },
    responses: { 200: { description: "Removed.", content: { "application/json": { schema: successResponse } } } },
  });
}

registerImageSlot({
  pathParam: "companyId",
  basePath: "/v1/files/portal-settings/{companyId}/logo",
  tag: "Files",
  slotName: "company logo",
  allowedTypes: "PNG, JPEG, WebP, or SVG",
  maxSize: "5MB",
});

registerImageSlot({
  pathParam: "companyId",
  basePath: "/v1/files/portal-settings/{companyId}/favicon",
  tag: "Files",
  slotName: "favicon",
  allowedTypes: "PNG, ICO, or SVG",
  maxSize: "1MB",
});

registerImageSlot({
  pathParam: "companyId",
  basePath: "/v1/files/portal-settings/{companyId}/hero-image",
  tag: "Files",
  slotName: "homepage hero image",
  allowedTypes: "PNG, JPEG, WebP, or GIF",
  maxSize: "8MB",
});

registerImageSlot({
  pathParam: "id",
  basePath: "/v1/files/portal-users/{id}/avatar",
  tag: "Files",
  slotName: "portal user's avatar",
  allowedTypes: "PNG, JPEG, or WebP",
  maxSize: "3MB",
});

registry.registerPath({
  method: "get",
  path: "/v1/files/packages/{id}/receipt",
  tags: ["Files"],
  summary: "Download the customer's uploaded receipt/invoice for a pre-alert",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "File bytes.", content: { "application/octet-stream": { schema: binaryResponse } } },
    404: { description: "No receipt uploaded.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/files/packages/{id}/receipt",
  tags: ["Files"],
  summary: "Upload/replace the receipt for a package",
  description: "Accepts PDF, JPEG, or PNG, up to 10MB.",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }), body: { content: { "multipart/form-data": { schema: uploadBody } } } },
  responses: {
    200: { description: "Uploaded.", content: { "application/json": { schema: fileNameResponse } } },
    400: { description: "Unsupported type or too large.", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/v1/files/packages/{id}/receipt",
  tags: ["Files"],
  summary: "Remove a package's receipt",
  security: [{ ApiKeyAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: "Removed.", content: { "application/json": { schema: successResponse } } } },
});
