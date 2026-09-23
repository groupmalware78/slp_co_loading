import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

export async function GET(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const rates = await prisma.shippingRate.findMany({
    where: { companyId },
    orderBy: [{ sortOrder: "asc" }, { minWeightLbs: "asc" }],
  });
  return NextResponse.json({ rates });
}

const rateSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(100),
  minWeightLbs: z.coerce.number().min(0),
  maxWeightLbs: z.coerce.number().min(0).optional().nullable(),
  price: z.coerce.number().min(0),
  sortOrder: z.coerce.number().int().optional(),
});

export async function POST(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const body = await request.json().catch(() => null);
  const parsed = rateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { label, minWeightLbs, maxWeightLbs, price, sortOrder } = parsed.data;

  const rate = await prisma.shippingRate.create({
    data: { companyId, label, minWeightLbs, maxWeightLbs: maxWeightLbs ?? null, price, sortOrder: sortOrder ?? 0 },
  });
  return NextResponse.json({ rate }, { status: 201 });
}
