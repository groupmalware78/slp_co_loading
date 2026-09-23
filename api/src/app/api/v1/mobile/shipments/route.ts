import { NextRequest, NextResponse } from "next/server";
import { Prisma, type PackageStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { packageInclude } from "@/lib/packageSchema";
import { getMobileSession, mobileForbiddenResponse, mobileUnauthorizedResponse } from "@/lib/mobileAuth";

const PAGE_SIZE = 25;

export async function GET(request: NextRequest) {
  const session = await getMobileSession(request);
  if (!session) return mobileUnauthorizedResponse();
  if (session.role !== "CUSTOMER") return mobileForbiddenResponse();

  const params = request.nextUrl.searchParams;
  const status = params.get("status") as PackageStatus | null;
  const page = Math.max(Number(params.get("page")) || 1, 1);

  const customer = await prisma.customer.findFirst({
    where: { email: session.email, companyId: session.companyId },
  });
  if (!customer) {
    return NextResponse.json({ shipments: [], total: 0, page: 1, totalPages: 1 });
  }

  const where: Prisma.PackageWhereInput = {
    companyId: session.companyId,
    customerId: customer.id,
    ...(status ? { status } : {}),
  };

  const [shipments, total] = await Promise.all([
    prisma.package.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: packageInclude,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.package.count({ where }),
  ]);

  return NextResponse.json({
    shipments,
    total,
    page,
    totalPages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
  });
}
