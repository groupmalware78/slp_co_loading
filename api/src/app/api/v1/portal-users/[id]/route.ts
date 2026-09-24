import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

export async function GET(
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
  const user = await prisma.portalUser.findUnique({ where: { id }, omit: { passwordHash: true } });
  if (!user || user.companyId !== companyId) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  return NextResponse.json({ user });
}

const PORTAL_ROLE_VALUES = ["ADMIN", "CSR", "CUSTOMER", "DRIVER", "LOGGER"] as const;

// Field-set-driven, same philosophy as internal/packages/[id] PATCH — the
// caller applies its own RBAC/email-verification gating before deciding
// which fields to send.
const patchSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  email: z.string().trim().email().optional(),
  role: z.enum(PORTAL_ROLE_VALUES).optional(),
  active: z.boolean().optional(),
  mustChangePassword: z.boolean().optional(),
  firstName: z.string().trim().min(1).max(75).optional(),
  lastName: z.string().trim().min(1).max(75).optional(),
  phone: z.string().trim().min(1).max(30).optional(),
  storeLocation: z.string().trim().max(150).optional().nullable(),
  addressLine1: z.string().trim().min(1).max(150).optional(),
  addressLine2: z.string().trim().max(150).optional().nullable(),
  cityParish: z.string().trim().min(1).max(100).optional(),
  country: z.string().trim().min(1).max(100).optional(),
  avatarUrl: z.string().trim().optional().nullable(),
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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.portalUser.findUnique({ where: { id } });
  if (!existing || existing.companyId !== companyId) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  if (parsed.data.email && parsed.data.email !== existing.email) {
    const emailConflict = await prisma.portalUser.findUnique({
      where: { companyId_email: { companyId, email: parsed.data.email } },
    });
    if (emailConflict) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }
  }

  const { firstName, lastName, name, ...rest } = parsed.data;
  const data: Prisma.PortalUserUpdateInput = { ...rest };
  if (name !== undefined) data.name = name;
  if (firstName !== undefined) data.firstName = firstName;
  if (lastName !== undefined) data.lastName = lastName;
  if (firstName !== undefined || lastName !== undefined) {
    data.name = `${firstName ?? existing.firstName ?? ""} ${lastName ?? existing.lastName ?? ""}`.trim();
  }

  try {
    const user = await prisma.portalUser.update({ where: { id }, data, omit: { passwordHash: true } });
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
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
  const { count } = await prisma.portalUser.deleteMany({ where: { id, companyId } });
  if (count === 0) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
