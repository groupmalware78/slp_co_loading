import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageRates } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

const patchSchema = z.object({
  perPackageRate: z.coerce.number().min(0, "Rate must be 0 or more"),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageRates(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const before = await prisma.company.findUnique({ where: { id }, select: { perPackageRate: true } });
  if (!before) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  try {
    const company = await prisma.company.update({
      where: { id },
      data: { perPackageRate: parsed.data.perPackageRate },
      select: { id: true, name: true, code: true, perPackageRate: true },
    });

    await recordAudit({
      entityType: "COMPANY",
      entityId: id,
      action: "UPDATE",
      performedById: session.user.id,
      before,
      after: { perPackageRate: company.perPackageRate },
    });

    return NextResponse.json({ company });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }
    throw err;
  }
}
