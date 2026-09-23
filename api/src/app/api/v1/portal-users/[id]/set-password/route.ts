import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";
import { passwordSchema } from "@/lib/passwordSchema";

// Trusted-caller reset — no current-password check. Used after a
// password-reset token has already been validated
// (internal/portal-users/password-reset/consume calls this internally
// rather than duplicating the hash+update), and by admin-initiated staff
// account creation/reset flows.
const schema = z.object({
  newPassword: passwordSchema,
  clearMustChangePassword: z.boolean().optional(),
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

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.portalUser.update({
    where: { id },
    data: {
      passwordHash,
      ...(parsed.data.clearMustChangePassword ? { mustChangePassword: false } : {}),
    },
  });
  return NextResponse.json({ success: true });
}
