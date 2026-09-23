import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { packageInclude } from "@/lib/packageSchema";
import { getMobileSession, mobileForbiddenResponse, mobileUnauthorizedResponse } from "@/lib/mobileAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getMobileSession(request);
  if (!session) return mobileUnauthorizedResponse();
  if (session.role !== "CUSTOMER") return mobileForbiddenResponse();

  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { email: session.email, companyId: session.companyId },
  });
  if (!customer) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }

  const pkg = await prisma.package.findUnique({ where: { id }, include: packageInclude });
  if (!pkg || pkg.customerId !== customer.id) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }

  return NextResponse.json({ shipment: pkg });
}
