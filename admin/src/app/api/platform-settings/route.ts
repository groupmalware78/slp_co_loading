import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBanking } from "@/lib/rbac";

const PLATFORM_SETTINGS_ID = "platform";

// Singleton settings — the platform operator's own banking info and
// invoice due-date terms, printed on the manifest billing invoice (see
// lib/manifestInvoicePdf.ts). Not company-scoped, so no [id] param and no
// audit log entry (AuditLog is entity-scoped to PACKAGE/COMPANY/CUSTOMER/
// USER/MANIFEST; this operator-only settings screen doesn't fit any of
// those and isn't user data).
export async function GET() {
  const session = await auth();
  if (!session?.user || !canManageBanking(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await prisma.platformSettings.findUnique({ where: { id: PLATFORM_SETTINGS_ID } });
  return NextResponse.json({ settings });
}

const patchSchema = z.object({
  bankName: z.string().trim().max(150).optional().nullable(),
  bankAccountName: z.string().trim().max(150).optional().nullable(),
  bankAccountNumber: z.string().trim().max(50).optional().nullable(),
  bankRoutingNumber: z.string().trim().max(50).optional().nullable(),
  bankBranch: z.string().trim().max(150).optional().nullable(),
  // Leave unset/null for no due date on future invoices.
  paymentDueDays: z.coerce.number().int().min(0).max(365).optional().nullable(),
});

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManageBanking(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const settings = await prisma.platformSettings.upsert({
    where: { id: PLATFORM_SETTINGS_ID },
    create: { id: PLATFORM_SETTINGS_ID, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ settings });
}
