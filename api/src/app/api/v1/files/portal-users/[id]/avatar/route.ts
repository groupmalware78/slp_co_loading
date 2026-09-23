import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";
import { ALLOWED_IMAGE_TYPES, contentTypeForFileName } from "@/lib/uploadTypes";

const MAX_SIZE_BYTES = 3 * 1024 * 1024;

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
  const user = await prisma.portalUser.findUnique({
    where: { id },
    select: { companyId: true, avatarImage: true, avatarImageFileName: true },
  });
  if (!user || user.companyId !== companyId || !user.avatarImage) {
    return NextResponse.json({ error: "No avatar uploaded." }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(user.avatarImage), {
    headers: {
      "Content-Type": contentTypeForFileName(user.avatarImageFileName),
      "Content-Disposition": `inline; filename="${user.avatarImageFileName ?? "avatar"}"`,
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
  const existing = await prisma.portalUser.findUnique({ where: { id }, select: { companyId: true } });
  if (!existing || existing.companyId !== companyId) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  const extension = ALLOWED_IMAGE_TYPES[file.type];
  if (!extension) {
    return NextResponse.json({ error: "Unsupported image type. Use PNG, JPEG, or WebP." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Avatar must be 3MB or smaller." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const fileName = `avatar.${extension}`;
  await prisma.portalUser.update({
    where: { id },
    data: { avatarImage: bytes, avatarImageFileName: fileName },
  });

  return NextResponse.json({ fileName });
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
  const { count } = await prisma.portalUser.updateMany({
    where: { id, companyId },
    data: { avatarImage: null, avatarImageFileName: null },
  });
  if (count === 0) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
