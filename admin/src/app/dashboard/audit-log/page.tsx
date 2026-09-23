import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewAuditLog } from "@/lib/rbac";
import { AuditLogView } from "@/components/AuditLogView";

const PAGE_SIZE = 25;

export default async function AuditLogPage() {
  const session = await auth();
  if (!session?.user || !canViewAuditLog(session.user.role)) {
    redirect("/dashboard");
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: {
        performedBy: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.auditLog.count(),
  ]);

  return (
    <AuditLogView
      initialLogs={JSON.parse(JSON.stringify(logs))}
      initialPagination={{
        page: 1,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
      }}
    />
  );
}
