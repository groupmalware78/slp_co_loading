import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

const schema = z.object({ token: z.string().min(1) });

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

  const user = await prisma.portalUser.findUnique({ where: { emailVerificationToken: parsed.data.token } });
  if (!user || user.companyId !== companyId || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
    return NextResponse.json({ error: "This verification link is invalid or has expired." }, { status: 400 });
  }

  await prisma.portalUser.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });

  return NextResponse.json({ success: true });
}
