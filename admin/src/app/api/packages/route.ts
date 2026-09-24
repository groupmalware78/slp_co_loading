import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canLogPackages } from "@/lib/rbac";
import {
  DEFAULT_PACKAGES_PAGE_SIZE,
  PACKAGE_STATUS_VALUES,
  SORTABLE_PACKAGE_FIELDS,
  packageDetailsSchema,
  packageInclude,
  type SortablePackageField,
} from "@/lib/packageSchema";
import { recordAudit } from "@/lib/audit";
import { recordPackageStatusEvent } from "@/lib/packageStatusHistory";
import { notifyPackageStatusChange } from "@/lib/packageStatusNotify";

function buildOrderBy(
  sortBy: string | null,
  sortDir: string | null
): Prisma.PackageOrderByWithRelationInput {
  const dir: Prisma.SortOrder = sortDir === "asc" ? "asc" : "desc";
  const field: SortablePackageField = SORTABLE_PACKAGE_FIELDS.includes(
    sortBy as SortablePackageField
  )
    ? (sortBy as SortablePackageField)
    : "updatedAt";

  switch (field) {
    case "trackingNumber":
      return { trackingNumber: dir };
    case "status":
      return { status: dir };
    case "company":
      return { company: { name: dir } };
    case "receivedBy":
      return { receivedBy: { name: dir } };
    case "receivedAt":
      return { receivedAt: dir };
    case "updatedAt":
      return { updatedAt: dir };
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const search = params.get("search")?.trim();
  const companyId = params.get("companyId")?.trim();
  const receivedById = params.get("receivedById")?.trim();
  const statusParam = params.get("status")?.trim();
  const status = PACKAGE_STATUS_VALUES.includes(statusParam as (typeof PACKAGE_STATUS_VALUES)[number])
    ? (statusParam as (typeof PACKAGE_STATUS_VALUES)[number])
    : undefined;
  const dateFrom = params.get("dateFrom")?.trim();
  const dateTo = params.get("dateTo")?.trim();
  const pageSize = Math.min(
    Math.max(Number(params.get("pageSize")) || DEFAULT_PACKAGES_PAGE_SIZE, 1),
    100
  );
  const page = Math.max(Number(params.get("page")) || 1, 1);

  const where: Prisma.PackageWhereInput = {};
  if (search) where.trackingNumber = { contains: search, mode: "insensitive" };
  if (companyId) where.companyId = companyId;
  if (receivedById) where.receivedById = receivedById;
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.receivedAt = {
      ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00`) } : {}),
      ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999`) } : {}),
    };
  }

  const [packages, total] = await Promise.all([
    prisma.package.findMany({
      where,
      orderBy: buildOrderBy(params.get("sortBy"), params.get("sortDir")),
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: packageInclude,
    }),
    prisma.package.count({ where }),
  ]);

  return NextResponse.json({
    packages,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canLogPackages(session.user.role)) {
    return NextResponse.json(
      { error: "You do not have permission to log packages." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = packageDetailsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { trackingNumber, status, packageType, pieces, notes, companyId, customerId, weightLbs, description } =
    parsed.data;

  // The quick-scan "Log Package" flow (LogPackageModal) only ever sends
  // trackingNumber + status — company, customer, pieces, etc. are meant
  // to be filled in later by editing the package. Zod's .default() on
  // packageType/pieces means parsed.data always has a concrete value
  // even when the request omitted the field entirely, so we track which
  // keys were actually present in the raw body to tell "explicitly set"
  // apart from "defaulted".
  const provided = (key: string) =>
    !!body && typeof body === "object" && Object.prototype.hasOwnProperty.call(body, key) &&
    (body as Record<string, unknown>)[key] !== undefined && (body as Record<string, unknown>)[key] !== "";

  try {
    // A customer may have already pre-alerted this exact shipment from
    // /my-shipments (a PENDING Package row with no receivedBy/receivedAt
    // yet). If this log matches one, update it in place instead of
    // creating a duplicate, so the customer's pre-alert (merchant name,
    // additional details, invoice) carries through to the now-received
    // package.
    //
    // The quick-scan flow never supplies companyId, so match on tracking
    // number alone across every company in that case — but only when
    // exactly one PENDING pre-alert has that tracking number, to avoid
    // guessing wrong if two different companies' customers happen to
    // share one (e.g. the same carrier tracking number).
    let existingPreAlert = companyId
      ? await prisma.package.findFirst({
          where: {
            status: "PENDING",
            companyId,
            trackingNumber,
            ...(provided("pieces") ? { pieces } : {}),
          },
        })
      : null;

    if (!existingPreAlert && !companyId) {
      const candidates = await prisma.package.findMany({
        where: { status: "PENDING", trackingNumber },
        take: 2,
      });
      if (candidates.length === 1) existingPreAlert = candidates[0];
    }

    // When merging into an existing pre-alert, only overwrite fields the
    // request actually provided — falling back to the pre-alert's own
    // values (not the schema's generic defaults) for everything else, so
    // a bare quick-scan log can't silently clobber what the customer
    // submitted.
    const data = existingPreAlert
      ? {
          trackingNumber,
          status,
          packageType: provided("packageType") ? packageType : existingPreAlert.packageType,
          pieces: provided("pieces") ? pieces : existingPreAlert.pieces,
          notes: provided("notes") ? notes : existingPreAlert.notes,
          companyId: companyId || existingPreAlert.companyId || undefined,
          customerId: customerId || existingPreAlert.customerId || undefined,
          weightLbs: provided("weightLbs") ? (weightLbs ?? undefined) : existingPreAlert.weightLbs,
          description: provided("description") ? description : existingPreAlert.description,
          receivedById: session.user.id,
          receivedAt: new Date(),
        }
      : {
          trackingNumber,
          status,
          packageType,
          pieces,
          notes,
          companyId: companyId || undefined,
          customerId: customerId || undefined,
          weightLbs: weightLbs ?? undefined,
          description,
          receivedById: session.user.id,
          receivedAt: new Date(),
        };

    const pkg = existingPreAlert
      ? await prisma.package.update({ where: { id: existingPreAlert.id }, data, include: packageInclude })
      : await prisma.package.create({ data, include: packageInclude });

    await recordAudit({
      entityType: "PACKAGE",
      entityId: pkg.id,
      action: existingPreAlert ? "UPDATE" : "CREATE",
      performedById: session.user.id,
      before: existingPreAlert ?? undefined,
      after: pkg,
    });

    await recordPackageStatusEvent({
      packageId: pkg.id,
      fromStatus: existingPreAlert?.status ?? null,
      toStatus: pkg.status,
      changedByLabel: `${session.user.name} (${session.user.role})`,
    });
    if (pkg.status !== existingPreAlert?.status) {
      await notifyPackageStatusChange(pkg, pkg.status);
    }

    return NextResponse.json({ package: pkg }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      const constraint = String(err.meta?.constraint ?? "");
      if (constraint.includes("receivedById")) {
        // The signed-in user no longer exists (e.g. account deleted, or a
        // session left over from a database reset) — the JWT is stale.
        return NextResponse.json(
          { error: "Your session is no longer valid. Please sign out and sign back in." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: "Selected company or customer no longer exists." },
        { status: 400 }
      );
    }
    throw err;
  }
}
