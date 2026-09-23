import { NextRequest, NextResponse } from "next/server";
import type { DeliveryStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

const PAGE_SIZE = 25;

// ?driverId= scopes to one driver's own assignments (customer-portal's
// /driver page for a DRIVER role); ?requestedById= scopes to one
// customer's own requests (their shipment detail page, to know whether
// they already have one pending for a package); omit both for the
// ADMIN/CSR "all deliveries" view — company scoping always applies via
// the package relation.
export async function GET(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const params = request.nextUrl.searchParams;
  const driverId = params.get("driverId");
  const packageId = params.get("packageId");
  const requestedById = params.get("requestedById");
  const status = params.get("status") as DeliveryStatus | null;
  const page = Math.max(Number(params.get("page")) || 1, 1);

  const where = {
    package: { companyId },
    ...(driverId ? { driverId } : {}),
    ...(packageId ? { packageId } : {}),
    ...(requestedById ? { requestedById } : {}),
    ...(status ? { status } : {}),
  };

  const [deliveries, total] = await Promise.all([
    prisma.deliveryAssignment.findMany({
      where,
      orderBy: { assignedAt: "desc" },
      include: {
        package: { select: { id: true, trackingNumber: true, description: true, pieces: true, packageType: true } },
        driver: { select: { id: true, name: true } },
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

// driverId is optional — a customer requesting home delivery
// (customer-portal's shipment detail page) creates one with no driver yet
// (status defaults to REQUESTED); staff assigning a driver directly (or
// the driver-assignment step on an existing request, via PATCH) pass one
// and the row starts life as ASSIGNED instead.
const createSchema = z.object({
  packageId: z.string().min(1),
  driverId: z.string().min(1).optional(),
  requestedById: z.string().min(1).optional(),
  addressLine1: z.string().trim().min(1, "Address line 1 is required").max(150),
  addressLine2: z.string().trim().max(150).optional(),
  cityParish: z.string().trim().min(1, "City / parish is required").max(100),
  country: z.string().trim().min(1, "Country is required").max(100),
});

export async function POST(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { packageId, driverId, requestedById, addressLine1, addressLine2, cityParish, country } = parsed.data;

  const [pkg, driver, requester] = await Promise.all([
    prisma.package.findUnique({ where: { id: packageId }, select: { companyId: true } }),
    driverId
      ? prisma.portalUser.findUnique({ where: { id: driverId }, select: { companyId: true } })
      : Promise.resolve(null),
    requestedById
      ? prisma.portalUser.findUnique({ where: { id: requestedById }, select: { companyId: true } })
      : Promise.resolve(null),
  ]);
  if (!pkg || pkg.companyId !== companyId) {
    return NextResponse.json({ error: "Package not found." }, { status: 400 });
  }
  if (driverId && (!driver || driver.companyId !== companyId)) {
    return NextResponse.json({ error: "Driver not found." }, { status: 400 });
  }
  if (requestedById && (!requester || requester.companyId !== companyId)) {
    return NextResponse.json({ error: "Requesting customer not found." }, { status: 400 });
  }

  const assignment = await prisma.deliveryAssignment.create({
    data: {
      packageId,
      driverId,
      requestedById,
      status: driverId ? "ASSIGNED" : "REQUESTED",
      addressLine1,
      addressLine2: addressLine2 || null,
      cityParish,
      country,
    },
    include: { package: { select: { trackingNumber: true } }, driver: { select: { name: true } } },
  });
  return NextResponse.json({ delivery: assignment }, { status: 201 });
}
