import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeletePackages, canEditPackages } from "@/lib/rbac";
import { packageDetailsSchema, packageInclude } from "@/lib/packageSchema";
import { recordAudit } from "@/lib/audit";
import { recordPackageStatusEvent } from "@/lib/packageStatusHistory";
import { notifyPackageStatusChange } from "@/lib/packageStatusNotify";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canEditPackages(session.user.role)) {
    return NextResponse.json(
      { error: "You do not have permission to edit packages." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = packageDetailsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const {
    trackingNumber,
    status,
    packageType,
    pieces,
    notes,
    companyId,
    customerId,
    weightLbs,
    description,
    paymentStatus,
    amountPaid,
  } = parsed.data;

  try {
    const before = await prisma.package.findUnique({ where: { id }, include: packageInclude });

    const pkg = await prisma.package.update({
      where: { id },
      data: {
        trackingNumber,
        status,
        packageType,
        pieces,
        notes,
        companyId: companyId || null,
        customerId: customerId || null,
        weightLbs: weightLbs ?? null,
        description: description || null,
        paymentStatus,
        amountPaid: amountPaid ?? null,
      },
      include: packageInclude,
    });

    await recordAudit({
      entityType: "PACKAGE",
      entityId: pkg.id,
      action: "UPDATE",
      performedById: session.user.id,
      before,
      after: pkg,
    });

    await recordPackageStatusEvent({
      packageId: pkg.id,
      fromStatus: before?.status ?? null,
      toStatus: pkg.status,
      changedByLabel: `${session.user.name} (${session.user.role})`,
    });
    if (before?.status !== pkg.status) {
      await notifyPackageStatusChange(pkg, pkg.status);
    }

    return NextResponse.json({ package: pkg });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json({ error: "Package not found." }, { status: 404 });
      }
      if (err.code === "P2003") {
        return NextResponse.json(
          { error: "Selected company or customer no longer exists." },
          { status: 400 }
        );
      }
    }
    throw err;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canDeletePackages(session.user.role)) {
    return NextResponse.json(
      { error: "You do not have permission to delete packages." },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    // Package.id has no cascading FK from packageStatusEvents/
    // deliveryAssignments (deliberately not a strict-cascade relation —
    // see the comment on PackageStatusEvent in schema.prisma), so a plain
    // package.delete() 500s with a foreign-key violation on any package
    // that's ever had a status change recorded, i.e. every real package.
    // Clear both first, in the same transaction as the delete itself.
    const [, , deleted] = await prisma.$transaction([
      prisma.packageStatusEvent.deleteMany({ where: { packageId: id } }),
      prisma.deliveryAssignment.deleteMany({ where: { packageId: id } }),
      prisma.package.delete({ where: { id }, include: packageInclude }),
    ]);

    await recordAudit({
      entityType: "PACKAGE",
      entityId: deleted.id,
      action: "DELETE",
      performedById: session.user.id,
      before: deleted,
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Package not found." }, { status: 404 });
    }
    throw err;
  }

  return NextResponse.json({ success: true });
}
