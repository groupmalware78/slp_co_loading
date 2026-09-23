import { NextRequest, NextResponse } from "next/server";
import { Prisma, type PackageStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";
import { packageInclude } from "@/lib/packageSchema";
import { recordPackageStatusEvent } from "@/lib/packageStatusHistory";
import { ALLOWED_RECEIPT_TYPES } from "@/lib/uploadTypes";

const PAGE_SIZE = 25;
const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024;

// General-purpose list, covering every customer-portal call site: the
// staff /packages directory (q/status/date range), /my-shipments'
// status-category filter (statusIn), mobile /shipments, driver-scoped
// views (driverId, via the DeliveryAssignment join), and the pre-alert /
// log-package duplicate-tracking-number check (trackingNumber, exact).
export async function GET(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const status = params.get("status") as PackageStatus | null;
  const statusIn = params.get("statusIn")?.split(",").filter(Boolean) as PackageStatus[] | undefined;
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  const customerId = params.get("customerId");
  const trackingNumber = params.get("trackingNumber");
  const driverId = params.get("driverId");
  const page = Math.max(Number(params.get("page")) || 1, 1);
  const pageSize = Math.min(Number(params.get("pageSize")) || PAGE_SIZE, 100);

  const where: Prisma.PackageWhereInput = {
    companyId,
    ...(q
      ? {
          OR: [
            { trackingNumber: { contains: q, mode: "insensitive" } },
            { customer: { name: { contains: q, mode: "insensitive" } } },
            { customer: { trn: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
    ...(statusIn && statusIn.length > 0 ? { status: { in: statusIn } } : {}),
    ...(dateFrom || dateTo
      ? {
          receivedAt: {
            ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00`) } : {}),
            ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999`) } : {}),
          },
        }
      : {}),
    ...(customerId ? { customerId } : {}),
    ...(trackingNumber ? { trackingNumber } : {}),
    ...(driverId ? { deliveryAssignments: { some: { driverId } } } : {}),
  };

  const [packages, total] = await Promise.all([
    prisma.package.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: packageInclude,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.package.count({ where }),
  ]);

  return NextResponse.json({
    packages,
    total,
    page,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  });
}

const PACKAGE_TYPE_VALUES = ["BOX", "BAG", "ENVELOPE", "OTHER"] as const;

const createSchema = z.object({
  trackingNumber: z.string().trim().min(1, "Tracking number is required").max(100),
  pieces: z.coerce.number().int().positive("Pieces must be at least 1"),
  packageType: z.enum(PACKAGE_TYPE_VALUES),
  description: z.string().trim().min(1, "Package description is required").max(150),
  weightLbs: z.coerce.number().positive("Weight must be greater than 0"),
  cost: z.coerce.number().min(0, "Cost must be 0 or more").optional(),
  additionalDetails: z.string().trim().max(500).optional(),
  merchantName: z.string().trim().max(150).optional(),
  customerId: z.string().trim().min(1, "customerId is required"),
  changedByLabel: z.string().trim().min(1),
});

// Creates a PENDING pre-alert package — used by customer-portal's
// /my-shipments and /mobile pre-alert flows. Multipart, not JSON: the
// receipt/invoice file is required at creation and is stored as bytes on
// this same row (invoiceImage) rather than uploaded separately first,
// since the package doesn't exist yet to attach a file to until this call
// completes.
export async function POST(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
  }

  const parsed = createSchema.safeParse({
    trackingNumber: formData.get("trackingNumber"),
    pieces: formData.get("pieces"),
    packageType: formData.get("packageType"),
    description: formData.get("description"),
    weightLbs: formData.get("weightLbs"),
    cost: formData.get("cost") || undefined,
    additionalDetails: formData.get("additionalDetails") || undefined,
    merchantName: formData.get("merchantName") || undefined,
    customerId: formData.get("customerId"),
    changedByLabel: formData.get("changedByLabel"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const {
    trackingNumber,
    pieces,
    packageType,
    description,
    weightLbs,
    cost,
    additionalDetails,
    merchantName,
    customerId,
    changedByLabel,
  } = parsed.data;

  const invoice = formData.get("invoice");
  if (!invoice || !(invoice instanceof File)) {
    return NextResponse.json({ error: "An invoice or receipt is required." }, { status: 400 });
  }
  const extension = ALLOWED_RECEIPT_TYPES[invoice.type];
  if (!extension) {
    return NextResponse.json({ error: "Unsupported invoice file type. Use PDF, JPEG, or PNG." }, { status: 400 });
  }
  if (invoice.size > MAX_RECEIPT_SIZE_BYTES) {
    return NextResponse.json({ error: "Invoice file must be 10MB or smaller." }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.companyId !== companyId) {
    return NextResponse.json({ error: "Customer not found." }, { status: 400 });
  }

  const existing = await prisma.package.findFirst({ where: { companyId, customerId, trackingNumber } });
  if (existing) {
    return NextResponse.json(
      { error: "A pre-alert (or shipment) with this tracking number already exists." },
      { status: 409 }
    );
  }

  const invoiceImage = new Uint8Array(await invoice.arrayBuffer());
  const invoiceFileName = invoice.name || `receipt.${extension}`;

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
      invoiceFileName,
      invoiceUploadedAt: new Date(),
      companyId,
      customerId,
    },
    include: packageInclude,
  });

  await recordPackageStatusEvent({
    packageId: pkg.id,
    fromStatus: null,
    toStatus: "PENDING",
    changedByLabel,
  });

  return NextResponse.json({ package: pkg }, { status: 201 });
}
