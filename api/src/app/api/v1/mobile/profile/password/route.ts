import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileSession, mobileUnauthorizedResponse } from "@/lib/mobileAuth";
import { passwordSchema } from "@/lib/passwordSchema";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export async function POST(request: NextRequest) {
  const session = await getMobileSession(request);
  if (!session) return mobileUnauthorizedResponse();

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.portalUser.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.portalUser.update({
    where: { id: session.userId },
    data: { passwordHash, mustChangePassword: false },
  });

  return NextResponse.json({ success: true });
}
