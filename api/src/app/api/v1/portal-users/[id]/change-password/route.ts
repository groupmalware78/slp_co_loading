import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";
import { passwordSchema } from "@/lib/passwordSchema";

// Self-service change — requires the current password. Compare with
// set-password (no verification, for token/admin-driven resets).
const schema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export async function POST(
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const user = await prisma.portalUser.findUnique({ where: { id } });
  if (!user || user.companyId !== companyId) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const matches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!matches) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.portalUser.update({ where: { id }, data: { passwordHash, mustChangePassword: false } });
  return NextResponse.json({ success: true });
}
