import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

// Backs customer-portal's /reports/customers page.
export async function GET(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const since = request.nextUrl.searchParams.get("since");
  const sinceDate = since ? new Date(since) : null;

  const [total, topCustomers, recent] = await Promise.all([
    prisma.customer.count({ where: { companyId } }),
    prisma.customer.findMany({
      where: { companyId },
      select: { id: true, name: true, email: true, _count: { select: { packages: true } } },
      orderBy: { packages: { _count: "desc" } },
      take: 10,
    }),
    sinceDate
      ? prisma.customer.findMany({ where: { companyId, createdAt: { gte: sinceDate } }, select: { createdAt: true } })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    total,
    topCustomers: topCustomers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      packageCount: c._count.packages,
    })),
    recentCreatedAt: recent.map((c) => c.createdAt),
  });
}
