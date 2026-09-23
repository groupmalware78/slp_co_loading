import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBanking } from "@/lib/rbac";

const patchSchema = z.object({
  label: z.string().trim().max(100).optional().nullable(),
  bankName: z.string().trim().min(1, "Bank name is required").max(150).optional(),
  accountName: z.string().trim().min(1, "Account name is required").max(150).optional(),
  accountNumber: z.string().trim().min(1, "Account number is required").max(50).optional(),
  routingNumber: z.string().trim().max(50).optional().nullable(),
  branch: z.string().trim().max(150).optional().nullable(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageBanking(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const bankAccount = await prisma.platformBankAccount.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ bankAccount });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Bank account not found." }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageBanking(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.platformBankAccount.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Bank account not found." }, { status: 404 });
    }
    throw err;
  }
}
