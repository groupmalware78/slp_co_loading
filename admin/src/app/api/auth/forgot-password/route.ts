import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const schema = z.object({
  email: z.string().trim().min(1).email(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const { email } = parsed.data;

  // Always respond the same way regardless of whether the account exists,
  // so this endpoint can't be used to enumerate registered emails.
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.active) {
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + TOKEN_TTL_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
  }

  return NextResponse.json({
    message: "If an account exists for that email, a reset link has been sent.",
  });
}
