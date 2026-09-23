import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

const locationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  address: z.string().trim().min(1, "Address is required").max(200),
  contactNumber: z.string().trim().min(1, "Contact number is required").max(30),
  hoursMonFri: z.string().trim().min(1, "Mon-Fri hours are required").max(100),
  hoursSat: z.string().trim().min(1, "Saturday hours are required").max(100),
  active: z.boolean().optional(),
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
  const parsed = locationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { name, address, contactNumber, hoursMonFri, hoursSat, active, sortOrder } = parsed.data;

  try {
    const location = await prisma.location.update({
      where: { id, companyId },
      data: { name, address, contactNumber, hoursMonFri, hoursSat, active: active ?? true, sortOrder: sortOrder ?? 0 },
    });
    return NextResponse.json({ location });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Location not found." }, { status: 404 });
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
    await prisma.location.delete({ where: { id, companyId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Location not found." }, { status: 404 });
    }
    throw err;
  }
  return NextResponse.json({ success: true });
}
