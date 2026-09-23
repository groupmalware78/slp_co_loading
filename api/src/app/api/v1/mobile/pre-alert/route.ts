import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileSession, mobileForbiddenResponse, mobileUnauthorizedResponse } from "@/lib/mobileAuth";
import { recordPackageStatusEvent } from "@/lib/packageStatusHistory";
import { ALLOWED_RECEIPT_TYPES } from "@/lib/uploadTypes";

const PACKAGE_TYPE_VALUES = ["BOX", "BAG", "ENVELOPE", "OTHER"] as const;

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const optionalTrimmed = (max: number) => z.preprocess(asString, z.string().trim().max(max).optional());

const preAlertSchema = z.object({
  trackingNumber: z.preprocess(asString, z.string().trim().min(1, "Tracking number is required").max(100)),
  pieces: z.coerce.number().int().positive("Pieces must be at least 1"),
  packageType: z.enum(PACKAGE_TYPE_VALUES),
  description: z.preprocess(asString, z.string().trim().min(1, "Package description is required").max(150)),
  weightLbs: z.coerce.number().positive("Weight must be greater than 0"),
  cost: z.coerce.number().min(0, "Cost must be 0 or more").optional(),
  additionalDetails: optionalTrimmed(500),
  merchantName: optionalTrimmed(150),
});

const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const session = await getMobileSession(request);
  if (!session) return mobileUnauthorizedResponse();
  if (session.role !== "CUSTOMER") return mobileForbiddenResponse();

  const portalUser = await prisma.portalUser.findUnique({ where: { id: session.userId } });
  if (!portalUser?.emailVerified) {
    return NextResponse.json(
      { error: "Please verify your email address before submitting a pre-alert." },
      { status: 403 }
    );
  }

  const customer = await prisma.customer.findFirst({
    where: { email: session.email, companyId: session.companyId },
  });
  if (!customer) {
    return NextResponse.json(
      { error: "We couldn't find your customer record. Please contact support." },
      { status: 404 }
    );
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
  }

  const parsed = preAlertSchema.safeParse({
    trackingNumber: formData.get("trackingNumber"),
    pieces: formData.get("pieces"),
    packageType: formData.get("packageType"),
    description: formData.get("description"),
    weightLbs: formData.get("weightLbs"),
    cost: formData.get("cost") || undefined,
    additionalDetails: formData.get("additionalDetails"),
    merchantName: formData.get("merchantName"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const file = formData.get("invoice");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "An invoice or receipt is required." }, { status: 400 });
  }
  if (!ALLOWED_RECEIPT_TYPES[file.type]) {
    return NextResponse.json(
      { error: "Unsupported invoice file type. Use PDF, JPEG, or PNG." },
      { status: 400 }
    );
  }
  if (file.size > MAX_RECEIPT_SIZE_BYTES) {
    return NextResponse.json({ error: "Invoice file must be 10MB or smaller." }, { status: 400 });
  }

  const { trackingNumber, pieces, packageType, description, weightLbs, cost, additionalDetails, merchantName } =
    parsed.data;

  const existing = await prisma.package.findFirst({
    where: { companyId: session.companyId, customerId: customer.id, trackingNumber },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You've already added a pre-alert (or shipment) with this tracking number." },
      { status: 409 }
    );
  }

  const invoiceImage = new Uint8Array(await file.arrayBuffer());

  const pkg = await prisma.package.create({
    data: {
      trackingNumber,
      status: "PENDING",
      packageType,
      pieces,
      description,
      weightLbs,
      cost: cost ?? null,
      merchantName: merchantName || null,
      additionalDetails: additionalDetails || null,
      invoiceImage,
      invoiceFileName: file.name,
      invoiceUploadedAt: new Date(),
      companyId: session.companyId,
      customerId: customer.id,
    },
  });

  await recordPackageStatusEvent({
    packageId: pkg.id,
    fromStatus: null,
    toStatus: "PENDING",
    changedByLabel: `${session.name} (Customer pre-alert, mobile)`,
  });

  return NextResponse.json({ shipment: pkg }, { status: 201 });
}
