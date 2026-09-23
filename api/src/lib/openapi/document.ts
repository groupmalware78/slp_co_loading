import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry";

// Side-effect imports — each registers its own paths onto the shared
// registry above. Import order doesn't matter; every path ends up in the
// same generated document.
import "./paths/tenantAndAuth";
import "./paths/customers";
import "./paths/packages";
import "./paths/portalUsers";
import "./paths/settingsAndConfig";
import "./paths/manifestsAndDeliveries";
import "./paths/files";
import "./paths/mobile";

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Freight Forwarder API",
      version: "1.0.0",
      description:
        "REST API for freight-forwarder client applications — customer portals, the driver/customer mobile app, and any other client in any language. Every /v1/** route (other than /v1/mobile/**) is authenticated by the x-api-key header, issued per company when it's registered in the Service-Provider app. /v1/mobile/** additionally requires a bearer JWT from POST /v1/mobile/auth/login for every route but the login itself.",
    },
    servers: [{ url: "/api" }],
  });
}
