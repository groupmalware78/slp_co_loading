import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canLogPackages, canViewDirectories } from "@/lib/rbac";
import { customerSchema } from "@/lib/customerSchema";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canViewDirectories(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ customers });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canLogPackages(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, email, phone, trn, companyId } = parsed.data;

  const emailConflict = await prisma.customer.findFirst({
    where: { email, companyId: companyId || null },
  });
  if (emailConflict) {
    return NextResponse.json(
      { error: "A customer with that email already exists for this company." },
      { status: 409 }
    );
  }

  if (trn) {
    const trnConflict = await prisma.customer.findFirst({
      where: { trn, companyId: companyId || null },
    });
    if (trnConflict) {
      return NextResponse.json(
        { error: "A customer with that TRN already exists for this company." },
        { status: 409 }
      );
    }
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone: phone || undefined,
        trn: trn || undefined,
        companyId: companyId || undefined,
      },
    });

    await recordAudit({
      entityType: "CUSTOMER",
      entityId: customer.id,
      action: "CREATE",
      performedById: session.user.id,
      after: customer,
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return NextResponse.json({ error: "Selected company no longer exists." }, { status: 400 });
    }
    throw err;
  }
}
