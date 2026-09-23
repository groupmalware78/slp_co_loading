import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { isApiError } from "@/lib/apiErrors";
import { writeRuntimeApiKey } from "@/lib/apiKeyStore";

// Self-service key rotation, triggered by a PortalRole.ADMIN user from
// /admin/api-key — replaces hand-editing TENANT_API_KEY in .env and
// restarting the process. Calls api/'s POST /v1/tenant/api-key/rotate
// (authenticated with the currently-valid key), then makes the new key
// durable (write the runtime file) before switching the live client over
// to it, so a mid-failure never leaves this deployment unable to reach
// api/ at all — see the comment below.
export async function POST() {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let result: { apiKey: string; apiKeyPrefix: string; rotatedAt: string; gracePeriodEndsAt: string | null };
  try {
    result = await apiClient.tenant.rotateApiKey();
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  // Durability first: if the file write fails, keep the live client on
  // the OLD key (still valid through its 48h grace period) rather than
  // switching to a key that only exists in memory and would be lost on
  // the next restart. The raw key is still returned below either way, so
  // the UI can show a manual "paste this into .env" fallback.
  let persisted = true;
  try {
    writeRuntimeApiKey(result.apiKey);
  } catch (err) {
    persisted = false;
    console.error("[api-key] Failed to persist rotated key to runtime file:", err);
  }
  if (persisted) apiClient.setApiKey(result.apiKey);

  return NextResponse.json({ ...result, persisted });
}
