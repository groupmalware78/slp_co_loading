import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "WAREHOUSE_ATTENDANT"]).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  if (id === session.user.id && parsed.data.active === false) {
    return NextResponse.json(
      { error: "You cannot deactivate your own account." },
      { status: 400 }
    );
  }

  const before = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  const user = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  await recordAudit({
    entityType: "USER",
    entityId: user.id,
    action: "UPDATE",
    performedById: session.user.id,
    before,
    after: user,
  });

  return NextResponse.json({ user });
}
