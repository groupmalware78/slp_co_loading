import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

const BASIS_VALUES = ["WEIGHT", "VALUE"] as const;

export async function GET(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const basis = request.nextUrl.searchParams.get("basis") as (typeof BASIS_VALUES)[number] | null;

  const feeRanges = await prisma.feeRange.findMany({
    where: { companyId, ...(basis ? { basis } : {}) },
    orderBy: [{ basis: "asc" }, { sortOrder: "asc" }, { min: "asc" }],
  });
  return NextResponse.json({ feeRanges });
}

const feeRangeSchema = z.object({
  basis: z.enum(BASIS_VALUES),
  label: z.string().trim().min(1, "Label is required").max(100),
  min: z.coerce.number().min(0),
  max: z.coerce.number().min(0).optional().nullable(),
  fee: z.coerce.number().min(0),
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
  const parsed = feeRangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { basis, label, min, max, fee, sortOrder } = parsed.data;

  const feeRange = await prisma.feeRange.create({
    data: { companyId, basis, label, min, max: max ?? null, fee, sortOrder: sortOrder ?? 0 },
  });
  return NextResponse.json({ feeRange }, { status: 201 });
}
