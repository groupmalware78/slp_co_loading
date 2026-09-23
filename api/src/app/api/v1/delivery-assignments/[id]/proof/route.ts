import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

// Company-scoped only — the caller (customer-portal) is responsible for
// checking the requesting user is either the assigned driver or the
// owning customer before calling this, same trust boundary as every other
// internal/** route.
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
  const type = request.nextUrl.searchParams.get("type") === "photo" ? "photo" : "signature";

  const assignment = await prisma.deliveryAssignment.findUnique({
    where: { id },
    select: {
      proofPhoto: true,
      proofSignature: true,
      package: { select: { companyId: true } },
    },
  });
  if (!assignment || assignment.package.companyId !== companyId) {
    return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
  }

  const bytes = type === "photo" ? assignment.proofPhoto : assignment.proofSignature;
  if (!bytes) {
    return NextResponse.json({ error: "No proof captured for this delivery." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": type === "photo" ? "image/jpeg" : "image/png" },
  });
}
