import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Generates and stores a reset token if the email matches an account —
// deliberately returns { token: null } rather than a 404 when it doesn't,
// so the caller's "check your email" response stays the same either way
// (no account-existence enumeration). The caller decides whether/how to
// email the link; this endpoint only handles the DB side.
const schema = z.object({ email: z.string().trim().email() });

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

  const user = await prisma.portalUser.findUnique({
    where: { companyId_email: { companyId, email: parsed.data.email } },
  });
  if (!user || !user.active) {
    return NextResponse.json({ token: null });
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_TTL_MS);
  await prisma.portalUser.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpires: expires },
  });

  return NextResponse.json({ token, user: { id: user.id, name: user.name, email: user.email } });
}
