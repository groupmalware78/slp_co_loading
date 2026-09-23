import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

// Status of the caller's own API key — never the raw key itself (there is
// none to return; only apiKeyHash is stored). usedPreviousKey tells the
// caller whether the key it just authenticated with is a still-valid
// grace-period key from a recent rotation, so customer-portal's own
// fallback poller (see apiKeyStatusPoller.ts) can warn an operator before
// the grace period ends. See POST ./rotate/route.ts to actually rotate.
export async function GET(request: NextRequest) {
  try {
    const { companyId, usedPreviousKey } = await requireInternalAuth(request);

    const company = await prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: {
        apiKeyPrefix: true,
        apiKeyScope: true,
        apiKeyRotatedAt: true,
        apiKeyRotationDays: true,
        apiKeyPreviousExpiresAt: true,
      },
    });

    return NextResponse.json({
      apiKeyPrefix: company.apiKeyPrefix,
      apiKeyScope: company.apiKeyScope,
      rotatedAt: company.apiKeyRotatedAt,
      rotationDays: company.apiKeyRotationDays,
      usedPreviousKey,
      gracePeriodEndsAt: company.apiKeyPreviousExpiresAt,
    });
  } catch (err) {
    return internalAuthErrorResponse(err);
  }
}
