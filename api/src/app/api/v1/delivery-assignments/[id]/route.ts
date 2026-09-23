import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

async function loadScopedAssignment(id: string, companyId: string) {
  const assignment = await prisma.deliveryAssignment.findUnique({
    where: { id },
    include: {
      package: {
        select: {
          id: true,
          trackingNumber: true,
          description: true,
          pieces: true,
          packageType: true,
          companyId: true,
          customer: { select: { email: true } },
        },
      },
      driver: { select: { id: true, name: true } },
    },
  });
  // Scoped by the package's companyId, not a column on the assignment
  // itself — mirrors the check in the web app's own
  // api/deliveries/[id]/route.ts (closes the cross-tenant hole that
  // existed before that check was added).
  if (!assignment || assignment.package.companyId !== companyId) return null;
  return assignment;
}

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
  const assignment = await loadScopedAssignment(id, companyId);
  if (!assignment) {
    return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
  }
  return NextResponse.json({ delivery: assignment });
}

// Field-set-driven like the other PATCH endpoints — the caller applies its
// own RBAC (e.g. "a DRIVER may only update their own assignment", "only
// ADMIN/CSR may set driverId") before calling this. DELIVERED normally
// goes through .../complete instead (requires proof); this still accepts
// it for the web app's ADMIN-driven status edit, which doesn't capture
// proof.
//
// driverId is how staff assign a REQUESTED delivery to a driver (or
// reassign an already-assigned one) — status defaults to ASSIGNED when
// driverId is set and status itself isn't also explicitly passed, but a
// caller can still send both together (e.g. to reassign an OUT_FOR_DELIVERY
// delivery without resetting its status). Address fields let a customer
// (or staff) correct the delivery address after the request was created.
const patchSchema = z.object({
  status: z.enum(["REQUESTED", "ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"]).optional(),
  driverId: z.string().min(1).nullable().optional(),
  notes: z.string().trim().max(500).optional(),
  addressLine1: z.string().trim().min(1).max(150).optional(),
  addressLine2: z.string().trim().max(150).optional().nullable(),
  cityParish: z.string().trim().min(1).max(100).optional(),
  country: z.string().trim().min(1).max(100).optional(),
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

  const existing = await loadScopedAssignment(id, companyId);
  if (!existing) {
    return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
  }

  const { status, driverId, notes, addressLine1, addressLine2, cityParish, country } = parsed.data;

  if (driverId) {
    const driver = await prisma.portalUser.findUnique({ where: { id: driverId }, select: { companyId: true } });
    if (!driver || driver.companyId !== companyId) {
      return NextResponse.json({ error: "Driver not found." }, { status: 400 });
    }
  }

  const resolvedStatus = status ?? (driverId && existing.status === "REQUESTED" ? "ASSIGNED" : undefined);

  const updated = await prisma.deliveryAssignment.update({
    where: { id },
    data: {
      ...(resolvedStatus !== undefined ? { status: resolvedStatus, deliveredAt: resolvedStatus === "DELIVERED" ? new Date() : null } : {}),
      ...(driverId !== undefined ? { driverId } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(addressLine1 !== undefined ? { addressLine1 } : {}),
      ...(addressLine2 !== undefined ? { addressLine2: addressLine2 || null } : {}),
      ...(cityParish !== undefined ? { cityParish } : {}),
      ...(country !== undefined ? { country } : {}),
    },
    include: { package: { select: { trackingNumber: true } }, driver: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ delivery: updated });
}
