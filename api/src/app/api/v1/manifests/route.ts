import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const params = request.nextUrl.searchParams;
  const page = Math.max(Number(params.get("page")) || 1, 1);
  const pageSize = Math.min(Number(params.get("pageSize")) || PAGE_SIZE, 200);

  const [manifests, total] = await Promise.all([
    prisma.manifest.findMany({
      where: { companyId },
      orderBy: { generatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.manifest.count({ where: { companyId } }),
  ]);

  return NextResponse.json({
    manifests,
    total,
    page,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  });
}
