import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";
import { ALLOWED_RECEIPT_TYPES, contentTypeForFileName } from "@/lib/uploadTypes";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

// The customer's OWN uploaded receipt/proof-of-purchase (Package.invoiceImage)
// — separate from the system-generated invoice PDF served by
// internal/packages/[id]/invoice. Used by customer-portal's /my-shipments
// detail page to attach or replace a receipt on a package that already
// exists (pre-alert creation attaches the first one inline — see
// internal/packages POST).
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
  const pkg = await prisma.package.findUnique({
    where: { id },
    select: { companyId: true, invoiceImage: true, invoiceFileName: true },
  });
  if (!pkg || pkg.companyId !== companyId || !pkg.invoiceImage) {
    return NextResponse.json({ error: "No receipt uploaded for this package." }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(pkg.invoiceImage), {
    headers: {
      "Content-Type": contentTypeForFileName(pkg.invoiceFileName),
      "Content-Disposition": `inline; filename="${pkg.invoiceFileName ?? "receipt"}"`,
    },
  });
}

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
  const existing = await prisma.package.findUnique({ where: { id }, select: { companyId: true } });
  if (!existing || existing.companyId !== companyId) {
    return NextResponse.json({ error: "Package not found." }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  const extension = ALLOWED_RECEIPT_TYPES[file.type];
  if (!extension) {
    return NextResponse.json({ error: "Unsupported file type. Use PDF, JPEG, or PNG." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File must be 10MB or smaller." }, { status: 400 });
  }

  const invoiceImage = new Uint8Array(await file.arrayBuffer());
  const invoiceFileName = file.name || `receipt.${extension}`;

  await prisma.package.update({
    where: { id },
    data: { invoiceImage, invoiceFileName, invoiceUploadedAt: new Date() },
  });

  return NextResponse.json({ fileName: invoiceFileName });
}

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
  const { count } = await prisma.package.updateMany({
    where: { id, companyId },
    data: { invoiceImage: null, invoiceFileName: null, invoiceUploadedAt: null },
  });
  if (count === 0) {
    return NextResponse.json({ error: "Package not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
