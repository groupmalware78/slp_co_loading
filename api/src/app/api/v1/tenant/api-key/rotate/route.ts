import { NextRequest, NextResponse } from "next/server";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";
import { rotateApiKey } from "@/lib/apiKeyRotation";

// Self-service rotation — called by a tenant's own customer-portal
// deployment (see customer-portal/src/app/api/admin/api-key/rotate/route.ts),
// authenticated with the CURRENTLY valid key. Unlike admin's
// ADMIN_MANUAL regenerate (hard cutover, revokes a leaked key
// immediately), this is a write and gets a 48h grace period: the old key
// keeps authenticating so the caller has time to persist the new one
// (customer-portal writes it to data/runtime-config.json) before the old
// one stops working.
//
// Because rotation is itself a write, a READ_ONLY-scoped key cannot call
// this endpoint (403 from requireInternalAuth's scope check) — that
// tenant must go through admin's regenerate-key instead. Expected, not a
// bug.
export async function POST(request: NextRequest) {
  try {
    const { companyId } = await requireInternalAuth(request);

    const { rawKey, company } = await rotateApiKey(companyId, {
      trigger: "PORTAL_MANUAL",
      gracePeriodHours: 48,
    });

    return NextResponse.json({
      apiKey: rawKey,
      apiKeyPrefix: company.apiKeyPrefix,
      rotatedAt: company.apiKeyRotatedAt,
      gracePeriodEndsAt: company.apiKeyPreviousExpiresAt,
    });
  } catch (err) {
    return internalAuthErrorResponse(err);
  }
}
