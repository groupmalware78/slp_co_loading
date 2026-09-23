import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileSession, mobileUnauthorizedResponse } from "@/lib/mobileAuth";

export async function GET(request: NextRequest) {
  const session = await getMobileSession(request);
  if (!session) return mobileUnauthorizedResponse();

  // Registration fields (address/phone/TRN) only ever get filled in for
  // self-registered CUSTOMER accounts — DRIVER accounts are created by
  // Service-Provider and these stay null, which the profile screen omits.
  const portalUser = await prisma.portalUser.findUnique({
    where: { id: session.userId },
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      addressLine1: true,
      addressLine2: true,
      cityParish: true,
      country: true,
      trn: true,
      storeLocation: true,
      emailVerified: true,
    },
  });

  return NextResponse.json({
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
      ...portalUser,
    },
  });
}
