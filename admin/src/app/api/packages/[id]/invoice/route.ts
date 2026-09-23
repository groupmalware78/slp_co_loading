import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditPackages } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canEditPackages(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const pkg = await prisma.package.findUnique({
    where: { id },
    select: { generatedInvoicePdf: true, generatedInvoiceFileName: true },
  });

  if (!pkg?.generatedInvoicePdf) {
    return NextResponse.json({ error: "No invoice has been generated for this package." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(pkg.generatedInvoicePdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pkg.generatedInvoiceFileName ?? "invoice.pdf"}"`,
    },
  });
}
