import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

const TTL_MS = 24 * 60 * 60 * 1000;

// Used both at signup (see internal/portal-users/signup, which issues its
// own token inline) and for customer-portal's "resend verification email"
// action.
const schema = z.object({ portalUserId: z.string().min(1) });

export async function POST(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const user = await prisma.portalUser.findUnique({ where: { id: parsed.data.portalUserId } });
  if (!user || user.companyId !== companyId) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TTL_MS);
  await prisma.portalUser.update({
    where: { id: user.id },
    data: { emailVerificationToken: token, emailVerificationExpires: expires },
  });

  return NextResponse.json({ token, user: { id: user.id, name: user.name, email: user.email } });
}
