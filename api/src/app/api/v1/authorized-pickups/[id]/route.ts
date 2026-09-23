import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

export async function DELETE(
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
  const portalUserId = request.nextUrl.searchParams.get("portalUserId");
  if (!portalUserId) {
    return NextResponse.json({ error: "portalUserId is required." }, { status: 400 });
  }

  const owner = await prisma.portalUser.findUnique({ where: { id: portalUserId }, select: { companyId: true } });
  if (!owner || owner.companyId !== companyId) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const { count } = await prisma.authorizedPickupPerson.deleteMany({ where: { id, portalUserId } });
  if (count === 0) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
