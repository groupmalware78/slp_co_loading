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

  const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "true";

  const locations = await prisma.location.findMany({
    where: { companyId, ...(activeOnly ? { active: true } : {}) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ locations });
}

const locationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  address: z.string().trim().min(1, "Address is required").max(200),
  contactNumber: z.string().trim().min(1, "Contact number is required").max(30),
  hoursMonFri: z.string().trim().min(1, "Mon-Fri hours are required").max(100),
  hoursSat: z.string().trim().min(1, "Saturday hours are required").max(100),
  active: z.boolean().optional(),
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
  const parsed = locationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { name, address, contactNumber, hoursMonFri, hoursSat, active, sortOrder } = parsed.data;

  const location = await prisma.location.create({
    data: {
      companyId,
      name,
      address,
      contactNumber,
      hoursMonFri,
      hoursSat,
      active: active ?? true,
      sortOrder: sortOrder ?? 0,
    },
  });
  return NextResponse.json({ location }, { status: 201 });
}
