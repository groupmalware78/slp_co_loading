import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewReports } from "@/lib/rbac";
import { ReportTabs } from "@/components/ReportTabs";
import { PACKAGE_STATUSES, STATUS_LABELS } from "@/components/PackageStatusBadge";
import { ChartCard } from "@/components/ChartCard";
import { buildAllPeriods, timeSeriesLookbackStart } from "@/lib/timeSeries";

function startOfDay(daysAgo: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

export default async function PackagesReportPage() {
  const session = await auth();
  if (!session?.user || !canViewReports(session.user.role)) {
    redirect("/dashboard");
  }

  const [total, byStatus, byCompany, today, last7Days, last30Days, recentPackages] = await Promise.all([
    prisma.package.count(),
    prisma.package.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.company.findMany({
      select: { id: true, name: true, _count: { select: { packages: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.package.count({ where: { createdAt: { gte: startOfDay(0) } } }),
    prisma.package.count({ where: { createdAt: { gte: startOfDay(6) } } }),
    prisma.package.count({ where: { createdAt: { gte: startOfDay(29) } } }),
    prisma.package.findMany({
      where: { createdAt: { gte: timeSeriesLookbackStart() } },
      select: { createdAt: true },
    }),
  ]);

  const statusCounts = new Map(byStatus.map((row) => [row.status, row._count._all]));
  const volumeSeries = buildAllPeriods(recentPackages.map((p) => ({ date: p.createdAt, value: 1 })));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
        <ReportTabs />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Total packages" value={total} />
        <SummaryCard label="Logged today" value={today} />
        <SummaryCard label="Last 7 days" value={last7Days} />
        <SummaryCard label="Last 30 days" value={last30Days} />
      </div>

      <ChartCard title="Package volume" series={volumeSeries} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
          <h2 className="text-sm font-semibold text-slate-900">By status</h2>
          <table className="mt-3 min-w-full divide-y divide-slate-100 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Packages</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PACKAGE_STATUSES.map((status) => (
                <tr key={status}>
                  <td className="py-2 text-slate-900">{STATUS_LABELS[status]}</td>
                  <td className="py-2 text-right text-slate-600">{statusCounts.get(status) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
          <h2 className="text-sm font-semibold text-slate-900">By company</h2>
          <table className="mt-3 min-w-full divide-y divide-slate-100 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2">Company</th>
                <th className="py-2 text-right">Packages</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {byCompany.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-4 text-center text-slate-400">
                    No companies yet.
                  </td>
                </tr>
              )}
              {byCompany.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 text-slate-900">{c.name}</td>
                  <td className="py-2 text-right text-slate-600">{c._count.packages}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
