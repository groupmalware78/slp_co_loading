import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isApiError } from "@/lib/apiErrors";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { ACTIVE_DELIVERY_STATUSES } from "@/lib/rbac";

const requestSchema = z.object({
  addressLine1: z.string().trim().min(1, "Address line 1 is required").max(150),
  addressLine2: z.string().trim().max(150).optional(),
  cityParish: z.string().trim().min(1, "City / parish is required").max(100),
  country: z.string().trim().min(1, "Country is required").max(100),
});

// Customer-only: request home delivery for one of their own packages.
// Creates a REQUESTED DeliveryAssignment (no driver yet) — see the
// comment on that model's driverId field.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { customer } = await apiClient.customers.byEmail(session.user.email ?? "");
  if (!customer) {
    return NextResponse.json({ error: "No customer record found for your account." }, { status: 400 });
  }

  let pkg;
  try {
    ({ package: pkg } = await apiClient.packages.get(id));
  } catch (err) {
    if (isApiError(err) && err.status === 404) {
      return NextResponse.json({ error: "Package not found." }, { status: 404 });
    }
    throw err;
  }
  if (pkg.customerId !== customer.id) {
    return NextResponse.json({ error: "Package not found." }, { status: 404 });
  }
  if (pkg.status === "DELIVERED") {
    return NextResponse.json({ error: "This package has already been delivered." }, { status: 400 });
  }

  const { deliveries: existing } = await apiClient.deliveryAssignments.list({ packageId: id });
  if (existing.some((d) => (ACTIVE_DELIVERY_STATUSES as readonly string[]).includes(d.status))) {
    return NextResponse.json({ error: "A delivery has already been requested for this package." }, { status: 409 });
  }

  const { delivery } = await apiClient.deliveryAssignments.create({
    packageId: id,
    requestedById: session.user.id,
    ...parsed.data,
  });
  return NextResponse.json({ delivery }, { status: 201 });
}
