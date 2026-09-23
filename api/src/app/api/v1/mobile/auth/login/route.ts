import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";
import { signMobileToken } from "@/lib/mobileAuth";

// The mobile app only serves drivers and customers — staff (ADMIN) keep
// using the web portals. One call: resolve tenant from x-api-key, verify
// credentials, mint a bearer JWT — collapses what was previously a
// customer-portal route calling this same app's own /v1/auth/login over
// HTTP into a single in-process step.
const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const MOBILE_ROLES = ["DRIVER", "CUSTOMER"] as const;

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

  const user = await prisma.portalUser.findUnique({ where: { companyId_email: { companyId, email } } });
  if (!user || !user.active) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordsMatch) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (!MOBILE_ROLES.includes(user.role as (typeof MOBILE_ROLES)[number])) {
    return NextResponse.json(
      { error: "This app is only available to drivers and customers." },
      { status: 403 }
    );
  }

  if (user.mustChangePassword) {
    return NextResponse.json(
      { error: "Please sign in to the web portal first to set a new password." },
      { status: 403 }
    );
  }

  const token = await signMobileToken({ sub: user.id, role: user.role, companyId });

  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
