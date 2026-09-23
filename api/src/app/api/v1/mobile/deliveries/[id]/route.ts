import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileSession, mobileForbiddenResponse, mobileUnauthorizedResponse } from "@/lib/mobileAuth";

// DELIVERED goes through POST .../complete instead, since it requires
// proof of delivery — this route only handles the non-terminal/failed
// transitions. Address fields are for the requesting CUSTOMER to correct
// their delivery address (mirrors customer-portal's web PATCH
// /api/deliveries/[id]) — a DRIVER sending them is rejected below, same as
// a CUSTOMER sending status/notes.
const updateSchema = z.object({
  status: z.enum(["OUT_FOR_DELIVERY", "FAILED"]).optional(),
  notes: z.string().trim().max(500).optional(),
  addressLine1: z.string().trim().min(1).max(150).optional(),
  addressLine2: z.string().trim().max(150).optional().nullable(),
  cityParish: z.string().trim().min(1).max(100).optional(),
  country: z.string().trim().min(1).max(100).optional(),
});

const PACKAGE_SELECT = {
  id: true,
  trackingNumber: true,
  description: true,
  pieces: true,
  packageType: true,
  companyId: true,
} as const;

async function loadAssignment(id: string, companyId: string) {
  const assignment = await prisma.deliveryAssignment.findUnique({
    where: { id },
    include: { package: { select: PACKAGE_SELECT } },
  });
  if (!assignment || assignment.package.companyId !== companyId) return null;
  return assignment;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getMobileSession(request);
  if (!session) return mobileUnauthorizedResponse();

  const { id } = await params;
  const assignment = await loadAssignment(id, session.companyId);
  if (!assignment) {
    return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
  }
  const isOwner =
    (session.role === "DRIVER" && assignment.driverId === session.userId) ||
    (session.role === "CUSTOMER" && assignment.requestedById === session.userId);
  if (!isOwner) {
    return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
  }

  return NextResponse.json({ delivery: assignment });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getMobileSession(request);
  if (!session) return mobileUnauthorizedResponse();
  if (session.role !== "DRIVER" && session.role !== "CUSTOMER") return mobileForbiddenResponse();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { status, notes, addressLine1, addressLine2, cityParish, country } = parsed.data;
  const editingAddress = addressLine1 !== undefined || addressLine2 !== undefined || cityParish !== undefined || country !== undefined;

  const assignment = await loadAssignment(id, session.companyId);
  if (!assignment) {
    return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
  }

  if (session.role === "DRIVER") {
    if (editingAddress) return mobileForbiddenResponse();
    if (assignment.driverId !== session.userId) {
      return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
    }
  } else {
    // CUSTOMER: address edits only, and only while the request hasn't
    // progressed past ASSIGNED — mirrors the web app's own rule.
    if (status !== undefined || notes !== undefined) return mobileForbiddenResponse();
    if (assignment.requestedById !== session.userId) {
      return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
    }
    if (assignment.status !== "REQUESTED" && assignment.status !== "ASSIGNED") {
      return NextResponse.json({ error: "This delivery can no longer be edited." }, { status: 400 });
    }
  }

  const updated = await prisma.deliveryAssignment.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status, notes: notes ?? assignment.notes } : {}),
      ...(addressLine1 !== undefined ? { addressLine1 } : {}),
      ...(addressLine2 !== undefined ? { addressLine2: addressLine2 || null } : {}),
      ...(cityParish !== undefined ? { cityParish } : {}),
      ...(country !== undefined ? { country } : {}),
    },
    include: { package: { select: PACKAGE_SELECT } },
  });

  return NextResponse.json({ delivery: updated });
}
