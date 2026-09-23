import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

// A single generic "verify these credentials for this tenant" primitive —
// deliberately not role-restricted or mustChangePassword-aware itself, so
// both of customer-portal's callers (its NextAuth authorize(), which needs
// mustChangePassword to force a reset, and its mobile JWT login, which
// additionally rejects staff roles) can apply their own business rules on
// top of one shared bcrypt verification instead of duplicating it.
const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const PORTAL_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  mustChangePassword: true,
  emailVerified: true,
  companyId: true,
} as const;

export async function POST(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.portalUser.findUnique({
    where: { companyId_email: { companyId, email } },
  });

  if (!user || !user.active) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordsMatch) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const safeUser = await prisma.portalUser.findUnique({
    where: { id: user.id },
    select: PORTAL_USER_SELECT,
  });

  return NextResponse.json({ user: safeUser });
}
