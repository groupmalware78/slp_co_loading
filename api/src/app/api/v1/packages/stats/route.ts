import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

// Backs customer-portal's /reports/packages page — the generic (paginated)
// packages list can't serve accurate whole-tenant aggregates, so this does
// the counting/grouping server-side instead of shipping every row over
// HTTP. `since` bounds the createdAt timestamps returned for the volume
// chart (the caller does its own period-bucketing over them).
function startOfDay(daysAgo: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

export async function GET(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const since = request.nextUrl.searchParams.get("since");
  const sinceDate = since ? new Date(since) : null;

  const [total, byStatus, today, last7Days, last30Days, recent] = await Promise.all([
    prisma.package.count({ where: { companyId } }),
    prisma.package.groupBy({ by: ["status"], where: { companyId }, _count: { _all: true } }),
    prisma.package.count({ where: { companyId, createdAt: { gte: startOfDay(0) } } }),
    prisma.package.count({ where: { companyId, createdAt: { gte: startOfDay(6) } } }),
    prisma.package.count({ where: { companyId, createdAt: { gte: startOfDay(29) } } }),
    sinceDate
      ? prisma.package.findMany({ where: { companyId, createdAt: { gte: sinceDate } }, select: { createdAt: true } })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    total,
    today,
    last7Days,
    last30Days,
    byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
    recentCreatedAt: recent.map((p) => p.createdAt),
  });
}
