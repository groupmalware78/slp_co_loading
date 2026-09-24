import { prisma } from "./prisma";
import { sendPackageStatusEmail, type PackageStatusEmailStatus } from "./email";
import { generateInvoicePdf } from "./invoicePdf";

const TRACKED_STATUSES: PackageStatusEmailStatus[] = [
  "RECEIVED",
  "SHIPPED",
  "READY_FOR_PICKUP",
  "DELIVERED",
];

interface NotifyPackage {
  id: string;
  hawb: number;
  trackingNumber: string;
  description: string | null;
  packageType: string;
  pieces: number;
  weightLbs: number | null;
  cost: number | null;
  paymentStatus: string;
  amountPaid: number | null;
  calculatedFee: number | null;
  calculatedFeeBasis: string | null;
  declaredValue: number | null;
  dutyImportDuty: number | null;
  dutyStampDuty: number | null;
  dutyAdditionalStampDuty: number | null;
  dutyGct: number | null;
  dutySct: number | null;
  dutyStandardComplianceFee: number | null;
  dutyEnvironmentalLevy: number | null;
  dutyCustomsAdminFee: number | null;
  companyId: string | null;
  customer: { name: string; email: string; customerCode: string | null } | null;
}

// Best-effort: a package status update should never fail because of an
// email/PDF hiccup, so every error here is swallowed after logging.
// Mirrors ../customer-portal's own lib/packageStatusNotify.ts — see the
// identical comment there on why the two apps duplicate this logic.
export async function notifyPackageStatusChange(pkg: NotifyPackage, toStatus: string): Promise<void> {
  if (!TRACKED_STATUSES.includes(toStatus as PackageStatusEmailStatus)) return;
  if (!pkg.customer?.email || !pkg.companyId) return;

  try {
    const settings = await prisma.portalSettings.findUnique({ where: { id: pkg.companyId } });
    const companyName = settings?.companyName ?? "Your Freight Forwarder";

    let attachment: { filename: string; content: Buffer } | null = null;
    if (toStatus === "READY_FOR_PICKUP" || toStatus === "DELIVERED") {
      const pdf = await generateInvoicePdf({
        package: {
          trackingNumber: pkg.trackingNumber,
          hawb: pkg.hawb,
          description: pkg.description,
          packageType: pkg.packageType,
          pieces: pkg.pieces,
          weightLbs: pkg.weightLbs,
          cost: pkg.cost,
          paymentStatus: pkg.paymentStatus,
          amountPaid: pkg.amountPaid,
          calculatedFee: pkg.calculatedFee,
          calculatedFeeBasis: pkg.calculatedFeeBasis,
          declaredValue: pkg.declaredValue,
          dutyImportDuty: pkg.dutyImportDuty,
          dutyStampDuty: pkg.dutyStampDuty,
          dutyAdditionalStampDuty: pkg.dutyAdditionalStampDuty,
          dutyGct: pkg.dutyGct,
          dutySct: pkg.dutySct,
          dutyStandardComplianceFee: pkg.dutyStandardComplianceFee,
          dutyEnvironmentalLevy: pkg.dutyEnvironmentalLevy,
          dutyCustomsAdminFee: pkg.dutyCustomsAdminFee,
        },
        customer: {
          name: pkg.customer.name,
          email: pkg.customer.email,
          customerCode: pkg.customer.customerCode,
        },
        settings: {
          companyName,
          contactEmail: settings?.contactEmail ?? null,
          contactPhone: settings?.contactPhone ?? null,
          bankName: settings?.bankName ?? null,
          bankAccountName: settings?.bankAccountName ?? null,
          bankAccountNumber: settings?.bankAccountNumber ?? null,
          bankRoutingNumber: settings?.bankRoutingNumber ?? null,
          bankBranch: settings?.bankBranch ?? null,
        },
      });
      const filename = `invoice-${pkg.trackingNumber}.pdf`;
      attachment = { filename, content: pdf };

      await prisma.package.update({
        where: { id: pkg.id },
        data: {
          generatedInvoicePdf: new Uint8Array(pdf),
          generatedInvoiceFileName: filename,
          generatedInvoiceAt: new Date(),
        },
      });
    }

    await sendPackageStatusEmail({
      companyId: pkg.companyId,
      to: pkg.customer.email,
      customerName: pkg.customer.name,
      companyName,
      trackingNumber: pkg.trackingNumber,
      description: pkg.description,
      status: toStatus as PackageStatusEmailStatus,
      attachment,
    });
  } catch (err) {
    console.error("[packageStatusNotify] failed to send status email", err);
  }
}
