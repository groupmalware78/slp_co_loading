import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewManifests } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canViewManifests(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const manifest = await prisma.manifest.findUnique({
    where: { id },
    select: { invoicePdf: true, invoiceFileName: true },
  });
  if (!manifest?.invoicePdf) {
    return NextResponse.json({ error: "No invoice generated for this manifest." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(manifest.invoicePdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${manifest.invoiceFileName ?? "invoice.pdf"}"`,
    },
  });
}
