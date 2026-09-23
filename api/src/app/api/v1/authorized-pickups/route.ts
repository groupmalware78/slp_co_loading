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

  const portalUserId = request.nextUrl.searchParams.get("portalUserId");
  if (!portalUserId) {
    return NextResponse.json({ error: "portalUserId is required." }, { status: 400 });
  }

  const owner = await prisma.portalUser.findUnique({ where: { id: portalUserId }, select: { companyId: true } });
  if (!owner || owner.companyId !== companyId) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const people = await prisma.authorizedPickupPerson.findMany({
    where: { portalUserId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ people });
}

const createSchema = z.object({
  portalUserId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(150),
  phone: z.string().trim().max(30).optional(),
  relationship: z.string().trim().max(100).optional(),
});

export async function POST(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { portalUserId, name, phone, relationship } = parsed.data;

  const owner = await prisma.portalUser.findUnique({ where: { id: portalUserId }, select: { companyId: true } });
  if (!owner || owner.companyId !== companyId) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const person = await prisma.authorizedPickupPerson.create({
    data: { portalUserId, name, phone: phone || null, relationship: relationship || null },
  });
  return NextResponse.json({ person }, { status: 201 });
}
