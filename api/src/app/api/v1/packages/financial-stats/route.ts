import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

// Backs customer-portal's /reports/financial page — returns the raw priced
// packages (cost/amountPaid/paymentStatus/customer), same shape the page
// used to query directly; the caller does its own totals/grouping, same
// split as /reports/packages and /reports/customers (aggregation server
// side only where it saves shipping whole-table rows, presentation-level
// reduction stays with the caller).
export async function GET(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const packages = await prisma.package.findMany({
    where: { companyId, cost: { not: null } },
    select: {
      cost: true,
      amountPaid: true,
      paymentStatus: true,
      customerId: true,
      createdAt: true,
      customer: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ packages });
}
