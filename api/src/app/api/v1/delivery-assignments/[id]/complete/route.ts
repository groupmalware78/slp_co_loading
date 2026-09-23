import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Marks a delivery DELIVERED and stores proof of delivery in one call —
// ported from customer-portal's api/mobile/deliveries/[id]/complete.
// Multipart: signature (required PNG), photo (optional), notes (optional).
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
  const assignment = await prisma.deliveryAssignment.findUnique({
    where: { id },
    include: { package: { select: { companyId: true } } },
  });
  if (!assignment || assignment.package.companyId !== companyId) {
    return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const signature = formData.get("signature");
  const photo = formData.get("photo");
  const notes = formData.get("notes");

  if (!(signature instanceof File) || signature.size === 0) {
    return NextResponse.json({ error: "A signature is required to complete delivery." }, { status: 400 });
  }
  if (signature.size > MAX_UPLOAD_BYTES || (photo instanceof File && photo.size > MAX_UPLOAD_BYTES)) {
    return NextResponse.json({ error: "File too large." }, { status: 400 });
  }

  const signatureBytes = new Uint8Array(await signature.arrayBuffer());
  const photoBytes = photo instanceof File && photo.size > 0 ? new Uint8Array(await photo.arrayBuffer()) : undefined;

  const updated = await prisma.deliveryAssignment.update({
    where: { id },
    data: {
      status: "DELIVERED",
      deliveredAt: new Date(),
      proofCapturedAt: new Date(),
      proofSignature: signatureBytes,
      ...(photoBytes ? { proofPhoto: photoBytes } : {}),
      ...(typeof notes === "string" && notes.trim() ? { notes: notes.trim() } : {}),
    },
    include: { package: { select: { trackingNumber: true } } },
  });

  return NextResponse.json({ delivery: updated });
}
