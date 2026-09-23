import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";
import { ALLOWED_FAVICON_TYPES, contentTypeForFileName } from "@/lib/uploadTypes";

const MAX_SIZE_BYTES = 1 * 1024 * 1024;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }
  const { companyId: requestedId } = await params;
  if (requestedId !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await prisma.portalSettings.findUnique({
    where: { id: companyId },
    select: { faviconImage: true, faviconImageFileName: true },
  });
  if (!settings?.faviconImage) {
    return NextResponse.json({ error: "No favicon uploaded." }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(settings.faviconImage), {
    headers: {
      "Content-Type": contentTypeForFileName(settings.faviconImageFileName),
      "Content-Disposition": `inline; filename="${settings.faviconImageFileName ?? "favicon"}"`,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }
  const { companyId: requestedId } = await params;
  if (requestedId !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  const extension = ALLOWED_FAVICON_TYPES[file.type];
  if (!extension) {
    return NextResponse.json({ error: "Unsupported image type. Use PNG, ICO, or SVG." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Favicon must be 1MB or smaller." }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
  if (!company) return NextResponse.json({ error: "Company not found." }, { status: 404 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const fileName = `favicon.${extension}`;
  await prisma.portalSettings.upsert({
    where: { id: companyId },
    create: { id: companyId, companyName: company.name, faviconImage: bytes, faviconImageFileName: fileName },
    update: { faviconImage: bytes, faviconImageFileName: fileName },
  });

  return NextResponse.json({ fileName });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }
  const { companyId: requestedId } = await params;
  if (requestedId !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.portalSettings.updateMany({
    where: { id: companyId },
    data: { faviconImage: null, faviconImageFileName: null },
  });
  return NextResponse.json({ success: true });
}
