import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileSession, mobileForbiddenResponse, mobileUnauthorizedResponse } from "@/lib/mobileAuth";

// The latest delivery assignment for one of the customer's own shipments
// (whether REQUESTED, ASSIGNED, OUT_FOR_DELIVERY, or a past FAILED/
// DELIVERED one) — null if they've never requested delivery for it. Mirrors
// customer-portal's own my-shipments/[id] page, which reads the same
// "most recent row" as the current state (a new request can only be made
// once no active one exists, so the latest row is always authoritative).
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

  const pkg = await prisma.package.findUnique({ where: { id }, select: { customerId: true } });
  if (!pkg || pkg.customerId !== customer.id) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }

  const delivery = await prisma.deliveryAssignment.findFirst({
    where: { packageId: id },
    orderBy: { assignedAt: "desc" },
    include: {
      driver: { select: { name: true } },
      package: { select: { id: true, trackingNumber: true, description: true, pieces: true, packageType: true } },
    },
  });

  return NextResponse.json({ delivery });
}
