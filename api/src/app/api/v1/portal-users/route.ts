import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

const PORTAL_ROLE_VALUES = ["ADMIN", "CSR", "CUSTOMER", "DRIVER"] as const;

// Staff-facing list — customer-portal's /admin/users page (CSR/DRIVER
// accounts it manages). ?role= filters to one role (e.g. excluding
// CUSTOMER self-registrations from that list).
export async function GET(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const role = request.nextUrl.searchParams.get("role");

  const users = await prisma.portalUser.findMany({
    where: { companyId, ...(role ? { role: role as (typeof PORTAL_ROLE_VALUES)[number] } : {}) },
    orderBy: { name: "asc" },
    omit: { passwordHash: true },
  });
  return NextResponse.json({ users });
}

// Generic staff-account creation (ADMIN creating a CSR/DRIVER account from
// customer-portal's /admin/users page) — NOT customer self-registration,
// which goes through /internal/portal-users/signup instead since it's a
// bigger transaction (Customer row, customer code, verification email).
const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(PORTAL_ROLE_VALUES),
  mustChangePassword: z.boolean().optional(),
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
  const { name, email, password, role, mustChangePassword } = parsed.data;

  const existing = await prisma.portalUser.findUnique({ where: { companyId_email: { companyId, email } } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.portalUser.create({
    data: { companyId, name, email, passwordHash, role, mustChangePassword: mustChangePassword ?? false },
    omit: { passwordHash: true },
  });
  return NextResponse.json({ user }, { status: 201 });
}
