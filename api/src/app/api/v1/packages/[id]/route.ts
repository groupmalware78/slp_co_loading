import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";
import { packageInclude } from "@/lib/packageSchema";
import { recordPackageStatusEvent } from "@/lib/packageStatusHistory";
import { notifyPackageStatusChange } from "@/lib/packageStatusNotify";

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
  const pkg = await prisma.package.findUnique({ where: { id }, include: packageInclude });
  if (!pkg || pkg.companyId !== companyId) {
    return NextResponse.json({ error: "Package not found." }, { status: 404 });
  }
  return NextResponse.json({ package: pkg });
}

const PACKAGE_STATUS_VALUES = [
  "RECEIVED",
  "SHIPPED",
  "AT_CUSTOMS",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DAMAGED",
  "EMPTY_PACKAGE",
  "RETURNED",
] as const;
const PACKAGE_TYPE_VALUES = ["BOX", "BAG", "ENVELOPE", "OTHER"] as const;
const PAYMENT_STATUS_VALUES = ["UNPAID", "PARTIAL", "PAID"] as const;

// Field-set-driven, not role-driven: the caller (customer-portal) is
// responsible for only including fields its own RBAC (editablePackageFields
// in its lib/rbac.ts) allows for the current session's role before calling
// this — this endpoint trusts the caller the same way it trusts the
// x-api-key, and doesn't need to know customer-portal's PortalRole model.
const patchSchema = z.object({
  status: z.enum(PACKAGE_STATUS_VALUES).optional(),
  packageType: z.enum(PACKAGE_TYPE_VALUES).optional(),
  weightLbs: z.coerce.number().positive("Weight must be greater than 0").optional().nullable(),
  pieces: z.coerce.number().int().positive("Pieces must be at least 1").optional(),
  description: z.string().trim().max(500).optional().nullable(),
  declaredValue: z.coerce.number().min(0, "Declared value must be 0 or more").optional().nullable(),
  customerId: z.string().trim().min(1).optional().nullable(),
  rate: z.coerce.number().min(0, "Rate must be 0 or more").optional().nullable(),
  cost: z.coerce.number().min(0, "Cost must be 0 or more").optional().nullable(),
  paymentStatus: z.enum(PAYMENT_STATUS_VALUES).optional(),
  amountPaid: z.coerce.number().min(0, "Amount paid must be 0 or more").optional().nullable(),
  changedByLabel: z.string().trim().min(1).optional(),
});

export async function PATCH(
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
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.package.findUnique({ where: { id } });
  if (!existing || existing.companyId !== companyId) {
    return NextResponse.json({ error: "Package not found." }, { status: 404 });
  }

  const {
    status,
    packageType,
    weightLbs,
    pieces,
    description,
    declaredValue,
    customerId,
    rate,
    cost,
    paymentStatus,
    amountPaid,
    changedByLabel,
  } = parsed.data;

  if (customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || customer.companyId !== companyId) {
      return NextResponse.json({ error: "Selected customer not found." }, { status: 400 });
    }
  }

  const data: Prisma.PackageUpdateInput = {};
  if (status !== undefined) data.status = status;
  if (packageType !== undefined) data.packageType = packageType;
  if (weightLbs !== undefined) data.weightLbs = weightLbs;
  if (pieces !== undefined) data.pieces = pieces;
  if (description !== undefined) data.description = description || null;
  if (declaredValue !== undefined) data.declaredValue = declaredValue;
  if (customerId !== undefined) data.customer = customerId ? { connect: { id: customerId } } : { disconnect: true };
  if (rate !== undefined) data.rate = rate;
  if (cost !== undefined) data.cost = cost;
  if (paymentStatus !== undefined) data.paymentStatus = paymentStatus;
  if (amountPaid !== undefined) data.amountPaid = amountPaid;

  try {
    const updated = await prisma.package.update({
      where: { id },
      data,
      include: packageInclude,
    });

    if (status !== undefined) {
      await recordPackageStatusEvent({
        packageId: updated.id,
        fromStatus: existing.status,
        toStatus: updated.status,
        changedByLabel: changedByLabel ?? "Unknown",
      });
      if (existing.status !== updated.status) {
        await notifyPackageStatusChange(updated, updated.status);
      }
    }

    return NextResponse.json({ package: updated });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Package not found." }, { status: 404 });
    }
    throw err;
  }
}
