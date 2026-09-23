import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCompanies } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

// Access-control settings for a company's API key — scope, rate limit,
// automatic-rotation interval, and where to push a freshly-rotated key on
// automatic rotation. Distinct from the key material itself (see
// regenerate-key/route.ts and ../../route.ts's POST) — this endpoint
// never touches apiKeyHash.
const patchSchema = z.object({
  apiKeyScope: z.enum(["FULL", "READ_ONLY"]),
  requestsPerMinute: z.coerce.number().int().min(0, "Must be 0 or more"),
  apiKeyRotationDays: z.coerce.number().int().min(0, "Must be 0 or more"),
  apiKeyWebhookUrl: z.string().url().nullable(),
  // true regenerates the webhook secret; omit/false leaves the existing
  // one in place. The secret itself is never sent back to the client
  // after the moment it's generated (see the response below).
  regenerateWebhookSecret: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageCompanies(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const before = await prisma.company.findUnique({
    where: { id },
    select: {
      apiKeyScope: true,
      requestsPerMinute: true,
      apiKeyRotationDays: true,
      apiKeyWebhookUrl: true,
      apiKeyWebhookSecret: true,
    },
  });
  if (!before) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const { regenerateWebhookSecret, ...rest } = parsed.data;
  const newWebhookSecret = regenerateWebhookSecret
    ? `whsec_${crypto.randomBytes(32).toString("hex")}`
    : undefined;

  try {
    const company = await prisma.company.update({
      where: { id },
      data: {
        ...rest,
        ...(newWebhookSecret ? { apiKeyWebhookSecret: newWebhookSecret } : {}),
      },
      select: {
        id: true,
        name: true,
        code: true,
        apiKeyScope: true,
        requestsPerMinute: true,
        apiKeyRotationDays: true,
        apiKeyWebhookUrl: true,
      },
    });

    await recordAudit({
      entityType: "COMPANY",
      entityId: id,
      action: "UPDATE",
      performedById: session.user.id,
      before,
      after: { ...rest, apiKeyWebhookSecret: newWebhookSecret ?? before.apiKeyWebhookSecret },
    });

    return NextResponse.json({
      company,
      // Returned once, only when freshly generated — the customer-portal
      // operator pastes this into that deployment's API_KEY_WEBHOOK_SECRET
      // env var. It is not retrievable again after this response.
      ...(newWebhookSecret ? { webhookSecret: newWebhookSecret } : {}),
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }
    throw err;
  }
}
