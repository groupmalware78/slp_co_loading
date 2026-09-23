import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileSession, mobileUnauthorizedResponse } from "@/lib/mobileAuth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getMobileSession(request);
  if (!session) return mobileUnauthorizedResponse();

  const { id } = await params;

  const { count } = await prisma.authorizedPickupPerson.deleteMany({
    where: { id, portalUserId: session.userId },
  });
  if (count === 0) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
