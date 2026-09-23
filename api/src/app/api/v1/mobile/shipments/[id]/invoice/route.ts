import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    return NextResponse.json({ error: "No invoice has been generated for this package." }, { status: 404 });
  }

  const pkg = await prisma.package.findUnique({
    where: { id },
    select: { customerId: true, generatedInvoicePdf: true, generatedInvoiceFileName: true },
  });
  if (!pkg || pkg.customerId !== customer.id || !pkg.generatedInvoicePdf) {
    return NextResponse.json({ error: "No invoice has been generated for this package." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(pkg.generatedInvoicePdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pkg.generatedInvoiceFileName ?? "invoice.pdf"}"`,
    },
  });
}
