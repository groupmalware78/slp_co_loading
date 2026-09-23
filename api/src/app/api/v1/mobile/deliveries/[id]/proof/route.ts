import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileSession, mobileForbiddenResponse, mobileUnauthorizedResponse } from "@/lib/mobileAuth";

// Serves back the photo or signature captured in .../complete, e.g. so the
// app can re-display a confirmation after the fact. ?type=photo|signature,
// defaults to signature.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getMobileSession(request);
  if (!session) return mobileUnauthorizedResponse();
  if (session.role !== "DRIVER" && session.role !== "CUSTOMER") return mobileForbiddenResponse();

  const { id } = await params;
  const type = request.nextUrl.searchParams.get("type") === "photo" ? "photo" : "signature";

  const assignment = await prisma.deliveryAssignment.findUnique({
    where: { id },
    select: {
      driverId: true,
      proofPhoto: true,
      proofSignature: true,
      package: { select: { companyId: true, customer: { select: { email: true } } } },
    },
  });
  if (!assignment || assignment.package.companyId !== session.companyId) {
    return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
  }

  const isOwnDelivery = session.role === "DRIVER" && assignment.driverId === session.userId;
  const isOwningCustomer = session.role === "CUSTOMER" && assignment.package.customer?.email === session.email;
  if (!isOwnDelivery && !isOwningCustomer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bytes = type === "photo" ? assignment.proofPhoto : assignment.proofSignature;
  if (!bytes) {
    return NextResponse.json({ error: "No proof captured for this delivery." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": type === "photo" ? "image/jpeg" : "image/png" },
  });
}
