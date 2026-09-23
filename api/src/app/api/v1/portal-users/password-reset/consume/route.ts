import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";
import { passwordSchema } from "@/lib/passwordSchema";

const schema = z.object({ token: z.string().min(1), newPassword: passwordSchema });

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

  const user = await prisma.portalUser.findUnique({ where: { passwordResetToken: parsed.data.token } });
  if (!user || user.companyId !== companyId || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.portalUser.update({
    where: { id: user.id },
    data: { passwordHash, passwordResetToken: null, passwordResetExpires: null, mustChangePassword: false },
  });

  return NextResponse.json({ success: true });
}
