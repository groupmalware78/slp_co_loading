import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

export async function GET(
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
  const pkg = await prisma.package.findUnique({ where: { id }, select: { companyId: true } });
  if (!pkg || pkg.companyId !== companyId) {
    return NextResponse.json({ error: "Package not found." }, { status: 404 });
  }

  const events = await prisma.packageStatusEvent.findMany({
    where: { packageId: id },
    orderBy: { changedAt: "desc" },
  });
  return NextResponse.json({ events });
}
