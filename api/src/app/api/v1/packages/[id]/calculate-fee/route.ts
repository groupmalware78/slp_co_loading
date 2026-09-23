import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";
import { packageInclude } from "@/lib/packageSchema";

const calculateFeeSchema = z.object({
  basis: z.enum(["WEIGHT", "VALUE"]),
  value: z.coerce.number().positive("Value must be greater than 0"),
});

// Matches the given weight/value against this company's configured
// FeeRange tiers for that basis and, if one matches, persists the result:
// the input value itself (onto Package.weightLbs for WEIGHT, or
// Package.declaredValue for VALUE — the fee calculator is how staff set
// these, not just compute against them) plus the matched fee
// (calculatedFee/calculatedFeeBasis/calculatedFeeAt). Re-matches
// server-side rather than trusting a client-computed fee amount, same
// reasoning as every other money-bearing field in this app.
export async function POST(
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
  const parsed = calculateFeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { basis, value } = parsed.data;

  const existing = await prisma.package.findUnique({ where: { id } });
  if (!existing || existing.companyId !== companyId) {
    return NextResponse.json({ error: "Package not found." }, { status: 404 });
  }

  const matched = await prisma.feeRange.findFirst({
    where: {
      companyId,
      basis,
      min: { lte: value },
      OR: [{ max: null }, { max: { gte: value } }],
    },
    orderBy: [{ sortOrder: "asc" }, { min: "asc" }],
  });

  if (!matched) {
    return NextResponse.json(
      { error: `No ${basis === "WEIGHT" ? "weight" : "value"} fee tier matches ${value}.` },
      { status: 400 }
    );
  }

  const updated = await prisma.package.update({
    where: { id },
    data: {
      ...(basis === "WEIGHT" ? { weightLbs: value } : { declaredValue: value }),
      calculatedFee: matched.fee,
      calculatedFeeBasis: basis,
      calculatedFeeAt: new Date(),
    },
    include: packageInclude,
  });

  return NextResponse.json({ package: updated, matchedFeeRange: matched });
}
