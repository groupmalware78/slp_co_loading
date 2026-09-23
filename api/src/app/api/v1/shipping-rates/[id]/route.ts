import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

const rateSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(100),
  minWeightLbs: z.coerce.number().min(0),
  maxWeightLbs: z.coerce.number().min(0).optional().nullable(),
  price: z.coerce.number().min(0),
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
  const parsed = rateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { label, minWeightLbs, maxWeightLbs, price, sortOrder } = parsed.data;

  try {
    const rate = await prisma.shippingRate.update({
      where: { id, companyId },
      data: { label, minWeightLbs, maxWeightLbs: maxWeightLbs ?? null, price, sortOrder: sortOrder ?? 0 },
    });
    return NextResponse.json({ rate });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Rate not found." }, { status: 404 });
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
    await prisma.shippingRate.delete({ where: { id, companyId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Rate not found." }, { status: 404 });
    }
    throw err;
  }
  return NextResponse.json({ success: true });
}
