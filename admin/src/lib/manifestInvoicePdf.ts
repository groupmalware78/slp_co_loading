import PDFDocument from "pdfkit";

// The Service-Provider platform's own billing invoice to a freight
// forwarder company for one manifest — distinct from ../api's
// invoicePdf.ts, which bills that company's own customer for a package.
// Amount is always packageCount * company.perPackageRate at generation
// time (see the comment on Manifest.invoiceAmount in schema.prisma).
export interface ManifestInvoicePdfInput {
  manifest: {
    id: string;
    generatedAt: Date;
    packageCount: number;
  };
  company: {
    name: string;
    code: string;
    contactName: string | null;
    contactEmail: string | null;
    address: string | null;
  };
  rate: number;
  amount: number;
  // The platform's own banking info — see PlatformSettings. Omitted (or
  // every field null) means no "Payment information" section is printed,
  // same convention as api/'s own invoicePdf.ts.
  platformSettings?: {
    bankName: string | null;
    bankAccountName: string | null;
    bankAccountNumber: string | null;
    bankRoutingNumber: string | null;
    bankBranch: string | null;
  } | null;
  // Locked in at generation time from PlatformSettings.paymentDueDays —
  // null means no due-date line is printed.
  dueDate?: Date | null;
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

export async function generateManifestInvoicePdf(input: ManifestInvoicePdfInput): Promise<Buffer> {
  const { manifest, company, rate, amount, platformSettings, dueDate } = input;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("Freight Forwarder Platform", { continued: false });
    doc.fontSize(10).fillColor("#555555").text("Manifest processing invoice");
    doc.fillColor("#000000");
    doc.moveDown(1);

    doc.fontSize(16).text("Invoice", { align: "right" });
    doc.fontSize(10).fillColor("#555555").text(`Manifest #${manifest.id.slice(-8).toUpperCase()}`, { align: "right" });
    doc.text(new Date().toLocaleDateString(), { align: "right" });
    doc.fillColor("#000000");
    doc.moveDown(1);

    doc.fontSize(12).text("Bill to");
    doc.fontSize(10).fillColor("#333333");
    doc.text(`${company.name} (${company.code})`);
    if (company.contactName) doc.text(company.contactName);
    if (company.contactEmail) doc.text(company.contactEmail);
    if (company.address) doc.text(company.address);
    doc.fillColor("#000000");
    doc.moveDown(1.5);

    const tableTop = doc.y;
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Description", 50, tableTop);
    doc.text("Manifest date", 260, tableTop);
    doc.text("Packages", 370, tableTop);
    doc.text("Rate", 440, tableTop);
    doc.text("Amount", 480, tableTop, { width: 70, align: "right" });
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    doc.font("Helvetica");
    const rowY = tableTop + 22;
    doc.text("Manifest processing fee", 50, rowY, { width: 200 });
    doc.text(manifest.generatedAt.toLocaleDateString(), 260, rowY);
    doc.text(String(manifest.packageCount), 370, rowY);
    doc.text(money(rate), 440, rowY);
    doc.text(money(amount), 480, rowY, { width: 70, align: "right" });

    doc.moveTo(50, rowY + 25).lineTo(550, rowY + 25).stroke();

    doc.moveDown(3);
    doc.fontSize(10);
    doc.font("Helvetica-Bold").text(`Total due: ${money(amount)}`, 50);
    if (dueDate) {
      doc.text(`Due date: ${dueDate.toLocaleDateString()}`, 50);
    }
    doc.font("Helvetica").fontSize(9).fillColor("#555555");
    doc.text(`${manifest.packageCount} package(s) × ${money(rate)}/package`, 50);
    doc.fillColor("#000000");

    const hasBankInfo =
      platformSettings &&
      (platformSettings.bankName ||
        platformSettings.bankAccountName ||
        platformSettings.bankAccountNumber ||
        platformSettings.bankRoutingNumber);
    if (hasBankInfo && platformSettings) {
      doc.moveDown(1.5);
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000").text("Payment information");
      doc.font("Helvetica").fontSize(10).fillColor("#333333");
      if (platformSettings.bankName) doc.text(`Bank: ${platformSettings.bankName}`);
      if (platformSettings.bankAccountName) doc.text(`Account name: ${platformSettings.bankAccountName}`);
      if (platformSettings.bankAccountNumber) doc.text(`Account number: ${platformSettings.bankAccountNumber}`);
      if (platformSettings.bankRoutingNumber) doc.text(`Routing number: ${platformSettings.bankRoutingNumber}`);
      if (platformSettings.bankBranch) doc.text(`Branch: ${platformSettings.bankBranch}`);
      doc.fillColor("#000000");
    }

    doc.end();
  });
}
