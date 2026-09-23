import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

const BASIS_VALUES = ["WEIGHT", "VALUE"] as const;

const feeRangeSchema = z.object({
  basis: z.enum(BASIS_VALUES),
  label: z.string().trim().min(1, "Label is required").max(100),
  min: z.coerce.number().min(0),
  max: z.coerce.number().min(0).optional().nullable(),
  fee: z.coerce.number().min(0),
  sortOrder: z.coerce.number().int().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = feeRangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { basis, label, min, max, fee, sortOrder } = parsed.data;

  try {
    const feeRange = await prisma.feeRange.update({
      where: { id, companyId },
      data: { basis, label, min, max: max ?? null, fee, sortOrder: sortOrder ?? 0 },
    });
    return NextResponse.json({ feeRange });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Fee range not found." }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const { id } = await params;
  try {
    await prisma.feeRange.delete({ where: { id, companyId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Fee range not found." }, { status: 404 });
    }
    throw err;
  }
  return NextResponse.json({ success: true });
}
