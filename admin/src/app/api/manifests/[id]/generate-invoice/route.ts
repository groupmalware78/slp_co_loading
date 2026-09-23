import { addDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewManifests } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { generateManifestInvoicePdf } from "@/lib/manifestInvoicePdf";

// Generates (or regenerates) this platform's own billing invoice for one
// manifest: amount = manifest.packageCount * company.perPackageRate, at
// today's rate — re-running this after the company's rate changes
// recalculates and overwrites the stored invoice, it doesn't preserve the
// original rate.
export async function POST(
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
    include: { company: true },
  });
  if (!manifest) {
    return NextResponse.json({ error: "Manifest not found." }, { status: 404 });
  }

  const rate = manifest.company.perPackageRate;
  const amount = manifest.packageCount * rate;
  const generatedAt = new Date();

  const platformSettings = await prisma.platformSettings.findUnique({ where: { id: "platform" } });
  const dueDate =
    platformSettings?.paymentDueDays != null ? addDays(generatedAt, platformSettings.paymentDueDays) : null;

  const pdf = await generateManifestInvoicePdf({
    manifest: { id: manifest.id, generatedAt: manifest.generatedAt, packageCount: manifest.packageCount },
    company: {
      name: manifest.company.name,
      code: manifest.company.code,
      contactName: manifest.company.contactName,
      contactEmail: manifest.company.contactEmail,
      address: manifest.company.address,
    },
    rate,
    amount,
    platformSettings,
    dueDate,
  });
  const fileName = `manifest-invoice-${manifest.company.code}-${manifest.id.slice(-8)}.pdf`;

  const updated = await prisma.manifest.update({
    where: { id },
    data: {
      invoiceAmount: amount,
      invoicePdf: new Uint8Array(pdf),
      invoiceFileName: fileName,
      invoiceGeneratedAt: generatedAt,
      invoiceDueDate: dueDate,
    },
    select: {
      id: true,
      generatedAt: true,
      packageCount: true,
      triggeredBy: true,
      invoiceAmount: true,
      invoiceGeneratedAt: true,
      invoiceDueDate: true,
      company: { select: { id: true, name: true, code: true, perPackageRate: true } },
    },
  });

  await recordAudit({
    entityType: "MANIFEST",
    entityId: manifest.id,
    action: "UPDATE",
    performedById: session.user.id,
    before: { invoiceAmount: manifest.invoiceAmount },
    after: { invoiceAmount: amount, rate, packageCount: manifest.packageCount },
  });

  return NextResponse.json({ manifest: updated });
}
