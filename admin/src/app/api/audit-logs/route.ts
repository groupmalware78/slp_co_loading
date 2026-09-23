import { NextRequest, NextResponse } from "next/server";
import { AuditEntity } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewAuditLog } from "@/lib/rbac";

const VALID_ENTITY_TYPES = new Set(Object.values(AuditEntity));

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canViewAuditLog(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pageSize = Math.min(Math.max(Number(request.nextUrl.searchParams.get("pageSize")) || 25, 1), 100);
  const page = Math.max(Number(request.nextUrl.searchParams.get("page")) || 1, 1);
  const entityTypeParam = request.nextUrl.searchParams.get("entityType");
  const entityType =
    entityTypeParam && VALID_ENTITY_TYPES.has(entityTypeParam as AuditEntity)
      ? (entityTypeParam as AuditEntity)
      : undefined;

  const where = entityType ? { entityType } : undefined;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        performedBy: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    },
  });
}
