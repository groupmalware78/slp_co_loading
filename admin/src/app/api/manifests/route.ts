import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewManifests } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canViewManifests(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pageSize = Math.min(Math.max(Number(request.nextUrl.searchParams.get("pageSize")) || 25, 1), 100);
  const page = Math.max(Number(request.nextUrl.searchParams.get("page")) || 1, 1);

  const [manifests, total] = await Promise.all([
    prisma.manifest.findMany({
      orderBy: { generatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        generatedAt: true,
        packageCount: true,
        triggeredBy: true,
        invoiceAmount: true,
        invoiceGeneratedAt: true,
        company: { select: { id: true, name: true, code: true, perPackageRate: true } },
      },
    }),
    prisma.manifest.count(),
  ]);

  return NextResponse.json({
    manifests,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    },
  });
}
