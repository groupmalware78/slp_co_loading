import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

// Streams the system-generated invoice PDF bytes — already a DB column on
// the one shared packages table, so this is a proxy, not a new storage
// design. customer-portal's own ownership check (which customer is
// allowed to see this package) happens before calling this, same trust
// boundary as internal/packages/[id] PATCH.
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
    select: { companyId: true, generatedInvoicePdf: true, generatedInvoiceFileName: true },
  });

  if (!pkg || pkg.companyId !== companyId) {
    return NextResponse.json({ error: "Package not found." }, { status: 404 });
  }
  if (!pkg.generatedInvoicePdf) {
    return NextResponse.json({ error: "No invoice has been generated for this package." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(pkg.generatedInvoicePdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pkg.generatedInvoiceFileName ?? "invoice.pdf"}"`,
    },
  });
}
