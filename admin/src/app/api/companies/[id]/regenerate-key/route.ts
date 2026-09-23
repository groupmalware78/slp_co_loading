import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCompanies } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { rotateApiKey } from "@/lib/apiKeyRotation";

// Issues a new API key for a company, invalidating the old one
// immediately (no grace period) — the existing customer-portal
// deployment using the old key will start failing right away until its
// runtime key is updated. Intentional hard cutover: this is how a leaked
// key gets revoked. Compare to a tenant's own self-service rotation
// (POST /v1/tenant/api-key/rotate), which keeps the old key working for a
// 48h grace period instead.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageCompanies(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const before = await prisma.company.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }

    const { rawKey, company } = await rotateApiKey(id, {
      trigger: "ADMIN_MANUAL",
      gracePeriodHours: 0,
    });

    await recordAudit({
      entityType: "COMPANY",
      entityId: company.id,
      action: "UPDATE",
      performedById: session.user.id,
      before,
      after: company,
    });

    // apiKey (raw) is returned once for CompaniesView's one-time reveal
    // banner — see the identical pattern in ../../route.ts's POST. The
    // full `company` row from rotateApiKey() carries apiKeyHash and
    // friends, which must never reach the client — send only the safe
    // display fields.
    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        code: company.code,
        apiKeyPrefix: company.apiKeyPrefix,
        apiKeyScope: company.apiKeyScope,
        apiKeyRotatedAt: company.apiKeyRotatedAt,
        apiKeyRotationDays: company.apiKeyRotationDays,
        apiKeyWebhookUrl: company.apiKeyWebhookUrl,
        requestsPerMinute: company.requestsPerMinute,
        contactName: company.contactName,
        contactEmail: company.contactEmail,
        contactPhone: company.contactPhone,
        address: company.address,
        active: company.active,
        perPackageRate: company.perPackageRate,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      },
      apiKey: rawKey,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }
    throw err;
  }
}
