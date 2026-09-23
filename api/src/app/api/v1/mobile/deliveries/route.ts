import { NextRequest, NextResponse } from "next/server";
import type { DeliveryStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileSession, mobileForbiddenResponse, mobileUnauthorizedResponse } from "@/lib/mobileAuth";

const PAGE_SIZE = 25;
const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = ["REQUESTED", "ASSIGNED", "OUT_FOR_DELIVERY"];

export async function GET(request: NextRequest) {
  const session = await getMobileSession(request);
  if (!session) return mobileUnauthorizedResponse();
  if (session.role !== "DRIVER") return mobileForbiddenResponse();

  const params = request.nextUrl.searchParams;
  const status = params.get("status") as DeliveryStatus | null;
  const page = Math.max(Number(params.get("page")) || 1, 1);

  const where = {
    driverId: session.userId,
    package: { companyId: session.companyId },
    ...(status ? { status } : {}),
  };

  const [deliveries, total] = await Promise.all([
    prisma.deliveryAssignment.findMany({
      where,
      orderBy: { assignedAt: "desc" },
      include: {
        package: {
          select: { id: true, trackingNumber: true, description: true, pieces: true, packageType: true },
        },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.deliveryAssignment.count({ where }),
  ]);

  return NextResponse.json({
    deliveries,
    total,
    page,
    totalPages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
  });
}

const requestSchema = z.object({
  packageId: z.string().min(1),
  addressLine1: z.string().trim().min(1, "Address line 1 is required").max(150),
  addressLine2: z.string().trim().max(150).optional(),
  cityParish: z.string().trim().min(1, "City / parish is required").max(100),
  country: z.string().trim().min(1, "Country is required").max(100),
});

// Customer-only: request home delivery for one of their own, undelivered
// packages — the mobile counterpart of ../../../packages/[id]/route.ts's
// web sibling (customer-portal's POST /api/packages/[id]/request-delivery).
// Creates a REQUESTED assignment with no driver yet; see the comment on
// DeliveryAssignment.driverId in the schema.
export async function POST(request: NextRequest) {
  const session = await getMobileSession(request);
  if (!session) return mobileUnauthorizedResponse();
  if (session.role !== "CUSTOMER") return mobileForbiddenResponse();

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { packageId, addressLine1, addressLine2, cityParish, country } = parsed.data;

  const customer = await prisma.customer.findFirst({
    where: { email: session.email, companyId: session.companyId },
  });
  if (!customer) {
    return NextResponse.json({ error: "No customer record found for your account." }, { status: 400 });
  }

  const pkg = await prisma.package.findUnique({ where: { id: packageId }, select: { customerId: true, status: true } });
  if (!pkg || pkg.customerId !== customer.id) {
    return NextResponse.json({ error: "Package not found." }, { status: 404 });
  }
  if (pkg.status === "DELIVERED") {
    return NextResponse.json({ error: "This package has already been delivered." }, { status: 400 });
  }

  const existingActive = await prisma.deliveryAssignment.findFirst({
    where: { packageId, status: { in: ACTIVE_DELIVERY_STATUSES } },
  });
  if (existingActive) {
    return NextResponse.json({ error: "A delivery has already been requested for this package." }, { status: 409 });
  }

  const delivery = await prisma.deliveryAssignment.create({
    data: {
      packageId,
      requestedById: session.userId,
      status: "REQUESTED",
      addressLine1,
      addressLine2: addressLine2 || null,
      cityParish,
      country,
    },
    include: {
      package: { select: { id: true, trackingNumber: true, description: true, pieces: true, packageType: true } },
    },
  });
  return NextResponse.json({ delivery }, { status: 201 });
}
