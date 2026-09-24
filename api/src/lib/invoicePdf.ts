import PDFDocument from "pdfkit";

const PACKAGE_TYPE_LABELS: Record<string, string> = {
  BOX: "Box",
  BAG: "Bag",
  ENVELOPE: "Envelope",
  OTHER: "Other",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partially paid",
  PAID: "Paid",
};

const DUTY_LABELS = {
  dutyImportDuty: "Import Duty",
  dutyStampDuty: "Stamp Duty",
  dutyAdditionalStampDuty: "Additional Stamp Duty",
  dutyGct: "General Consumption Tax (GCT)",
  dutySct: "Special Consumption Tax (SCT)",
  dutyStandardComplianceFee: "Standard Compliance Fee",
  dutyEnvironmentalLevy: "Environmental Levy",
  dutyCustomsAdminFee: "Customs Administrative Fee",
} as const;
type DutyField = keyof typeof DUTY_LABELS;
const DUTY_FIELDS = Object.keys(DUTY_LABELS) as DutyField[];

export interface InvoicePdfInput {
  package: {
    trackingNumber: string;
    hawb: number;
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
  };
  customer: {
    name: string;
    email: string;
    customerCode: string | null;
  };
  settings: {
    companyName: string;
    contactEmail: string | null;
    contactPhone: string | null;
    bankName: string | null;
    bankAccountName: string | null;
    bankAccountNumber: string | null;
    bankRoutingNumber: string | null;
    bankBranch: string | null;
  };
}

function money(n: number | null): string {
  return n == null ? "—" : `$${n.toFixed(2)}`;
}

// Each duty field is a percentage of the package's declaredValue, not a
// flat dollar amount — kept in sync with customer-portal's
// lib/rbac.ts's own dutyAmount().
function dutyAmount(percentage: number | null, declaredValue: number | null): number {
  if (percentage == null || declaredValue == null) return 0;
  return (declaredValue * percentage) / 100;
}

export async function generateInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const { package: pkg, customer, settings } = input;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(settings.companyName, { continued: false });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor("#555555");
    if (settings.contactEmail) doc.text(settings.contactEmail);
    if (settings.contactPhone) doc.text(settings.contactPhone);
    doc.fillColor("#000000");
    doc.moveDown(1);

    doc.fontSize(16).text("Invoice", { align: "right" });
    doc.fontSize(10).fillColor("#555555").text(`HAWB #${pkg.hawb}`, { align: "right" });
    doc.text(new Date().toLocaleDateString(), { align: "right" });
    doc.fillColor("#000000");
    doc.moveDown(1);

    doc.fontSize(12).text("Bill to");
    doc.fontSize(10).fillColor("#333333");
    doc.text(customer.name);
    doc.text(customer.email);
    if (customer.customerCode) doc.text(`Customer ID: ${customer.customerCode}`);
    doc.fillColor("#000000");
    doc.moveDown(1.5);

    const tableTop = doc.y;
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Description", 50, tableTop);
    doc.text("Type", 260, tableTop);
    doc.text("Pieces", 340, tableTop);
    doc.text("Weight", 400, tableTop);
    doc.text("Cost", 480, tableTop, { width: 70, align: "right" });
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    doc.font("Helvetica");
    const rowY = tableTop + 22;
    doc.text(pkg.description || pkg.trackingNumber, 50, rowY, { width: 200 });
    doc.text(PACKAGE_TYPE_LABELS[pkg.packageType] ?? pkg.packageType, 260, rowY);
    doc.text(String(pkg.pieces), 340, rowY);
    doc.text(pkg.weightLbs != null ? `${pkg.weightLbs} lbs` : "—", 400, rowY);
    doc.text(money(pkg.cost), 480, rowY, { width: 70, align: "right" });

    doc.moveTo(50, rowY + 25).lineTo(550, rowY + 25).stroke();

    let feeRowBottom = rowY + 25;
    if (pkg.calculatedFee != null) {
      const feeRowY = rowY + 32;
      const feeLabel = pkg.calculatedFeeBasis === "VALUE" ? "Fee (value-based)" : "Fee (weight-based)";
      doc.text(feeLabel, 50, feeRowY, { width: 200 });
      doc.text(money(pkg.calculatedFee), 480, feeRowY, { width: 70, align: "right" });
      doc.moveTo(50, feeRowY + 25).lineTo(550, feeRowY + 25).stroke();
      feeRowBottom = feeRowY + 25;
    }

    // Jamaica Customs Agency duties (see the comment on Package.declaredValue
    // in schema.prisma) — one row per non-null duty the logger entered
    // (shown as a % of declared value, alongside the dollar amount it
    // works out to), plus a bold total when more than one applies.
    const applicableDuties = DUTY_FIELDS.filter((field) => pkg[field] != null);
    const totalDuties = applicableDuties.reduce(
      (sum, field) => sum + dutyAmount(pkg[field], pkg.declaredValue),
      0
    );
    let dutiesRowBottom = feeRowBottom;
    if (applicableDuties.length > 0) {
      let dutyRowY = feeRowBottom + 7;
      for (const field of applicableDuties) {
        doc.text(`${DUTY_LABELS[field]} (${pkg[field]}%)`, 50, dutyRowY, { width: 200 });
        doc.text(money(dutyAmount(pkg[field], pkg.declaredValue)), 480, dutyRowY, { width: 70, align: "right" });
        dutyRowY += 18;
      }
      if (applicableDuties.length > 1) {
        doc.font("Helvetica-Bold");
        doc.text("Total duties", 50, dutyRowY, { width: 200 });
        doc.text(money(totalDuties), 480, dutyRowY, { width: 70, align: "right" });
        doc.font("Helvetica");
        dutyRowY += 18;
      }
      doc.moveTo(50, dutyRowY).lineTo(550, dutyRowY).stroke();
      dutiesRowBottom = dutyRowY;
    }

    doc.y = dutiesRowBottom;
    doc.moveDown(2);
    doc.fontSize(10);
    doc.text(`Tracking number: ${pkg.trackingNumber}`, 50);
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").text(`Payment status: ${PAYMENT_STATUS_LABELS[pkg.paymentStatus] ?? pkg.paymentStatus}`, 50);
    doc.font("Helvetica");
    if (pkg.amountPaid != null && pkg.amountPaid > 0) {
      doc.text(`Amount paid: ${money(pkg.amountPaid)}`, 50);
    }
    const total = (pkg.cost ?? 0) + (pkg.calculatedFee ?? 0) + totalDuties;
    if (pkg.cost != null || pkg.calculatedFee != null || applicableDuties.length > 0) {
      const outstanding = Math.max(total - (pkg.amountPaid ?? 0), 0);
      if (outstanding > 0) {
        doc.text(`Balance due: ${money(outstanding)}`, 50);
      }
    }

    const hasBankInfo =
      settings.bankName || settings.bankAccountName || settings.bankAccountNumber || settings.bankRoutingNumber;
    if (hasBankInfo) {
      doc.moveDown(1.5);
      doc.font("Helvetica-Bold").text("Payment information");
      doc.font("Helvetica").fontSize(10).fillColor("#333333");
      if (settings.bankName) doc.text(`Bank: ${settings.bankName}`);
      if (settings.bankAccountName) doc.text(`Account name: ${settings.bankAccountName}`);
      if (settings.bankAccountNumber) doc.text(`Account number: ${settings.bankAccountNumber}`);
      if (settings.bankRoutingNumber) doc.text(`Routing number: ${settings.bankRoutingNumber}`);
      if (settings.bankBranch) doc.text(`Branch: ${settings.bankBranch}`);
      doc.fillColor("#000000");
    }

    doc.end();
  });
}
