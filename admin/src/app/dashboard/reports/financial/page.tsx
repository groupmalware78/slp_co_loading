import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewReports } from "@/lib/rbac";
import { ReportTabs } from "@/components/ReportTabs";
import { PAYMENT_STATUS_LABELS } from "@/components/PackageStatusBadge";
import { ChartCard } from "@/components/ChartCard";
import { buildAllPeriods } from "@/lib/timeSeries";
import type { PaymentStatus } from "@prisma/client";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export default async function FinancialReportPage() {
  const session = await auth();
  if (!session?.user || !canViewReports(session.user.role)) {
    redirect("/dashboard");
  }

  const packages = await prisma.package.findMany({
    where: { cost: { not: null } },
    select: {
      cost: true,
      amountPaid: true,
      paymentStatus: true,
      companyId: true,
      customerId: true,
      createdAt: true,
      company: { select: { name: true } },
      customer: { select: { name: true, email: true } },
    },
  });

  const revenueSeries = buildAllPeriods(
    packages.map((p) => ({ date: p.createdAt, value: p.cost ?? 0 }))
  );

  let totalBilled = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;

  const byCompany = new Map<string, { name: string; billed: number; collected: number; outstanding: number; count: number }>();
  const byStatus = new Map<PaymentStatus, { count: number; billed: number }>();
  const byCustomer = new Map<string, { name: string; email: string; outstanding: number }>();

  for (const pkg of packages) {
    const billed = pkg.cost ?? 0;
    const collected = pkg.amountPaid ?? 0;
    const outstanding = Math.max(billed - collected, 0);

    totalBilled += billed;
    totalCollected += collected;
    totalOutstanding += outstanding;

    const companyKey = pkg.companyId ?? "none";
    const companyName = pkg.company?.name ?? "Unassigned";
    const companyEntry = byCompany.get(companyKey) ?? { name: companyName, billed: 0, collected: 0, outstanding: 0, count: 0 };
    companyEntry.billed += billed;
    companyEntry.collected += collected;
    companyEntry.outstanding += outstanding;
    companyEntry.count += 1;
    byCompany.set(companyKey, companyEntry);

    const statusEntry = byStatus.get(pkg.paymentStatus) ?? { count: 0, billed: 0 };
    statusEntry.count += 1;
    statusEntry.billed += billed;
    byStatus.set(pkg.paymentStatus, statusEntry);

    if (outstanding > 0 && pkg.customerId && pkg.customer) {
      const custEntry = byCustomer.get(pkg.customerId) ?? { name: pkg.customer.name, email: pkg.customer.email, outstanding: 0 };
      custEntry.outstanding += outstanding;
      byCustomer.set(pkg.customerId, custEntry);
    }
  }

  const companyRows = [...byCompany.values()].sort((a, b) => b.billed - a.billed);
  const statusRows = [...byStatus.entries()].sort((a, b) => b[1].billed - a[1].billed);
  const topDebtors = [...byCustomer.values()].sort((a, b) => b.outstanding - a.outstanding).slice(0, 10);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
        <ReportTabs />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Total revenue (billed)" value={money(totalBilled)} />
        <SummaryCard label="Collected" value={money(totalCollected)} />
        <SummaryCard label="Outstanding balance" value={money(totalOutstanding)} accent="text-amber-600" />
      </div>

      <ChartCard title="Revenue over time" series={revenueSeries} format="currency" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
          <h2 className="text-sm font-semibold text-slate-900">Revenue by company</h2>
          <table className="mt-3 min-w-full divide-y divide-slate-100 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2">Company</th>
                <th className="py-2 text-right">Packages</th>
                <th className="py-2 text-right">Billed</th>
                <th className="py-2 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companyRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400">
                    No priced packages yet.
                  </td>
                </tr>
              )}
              {companyRows.map((row) => (
                <tr key={row.name}>
                  <td className="py-2 text-slate-900">{row.name}</td>
                  <td className="py-2 text-right text-slate-600">{row.count}</td>
                  <td className="py-2 text-right text-slate-600">{money(row.billed)}</td>
                  <td className="py-2 text-right text-amber-600">{money(row.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
          <h2 className="text-sm font-semibold text-slate-900">By payment status</h2>
          <table className="mt-3 min-w-full divide-y divide-slate-100 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Packages</th>
                <th className="py-2 text-right">Billed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {statusRows.map(([status, row]) => (
                <tr key={status}>
                  <td className="py-2 text-slate-900">{PAYMENT_STATUS_LABELS[status]}</td>
                  <td className="py-2 text-right text-slate-600">{row.count}</td>
                  <td className="py-2 text-right text-slate-600">{money(row.billed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
        <h2 className="text-sm font-semibold text-slate-900">Top outstanding balances</h2>
        <table className="mt-3 min-w-full divide-y divide-slate-100 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-2">Customer</th>
              <th className="py-2">Email</th>
              <th className="py-2 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {topDebtors.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-slate-400">
                  No outstanding balances.
                </td>
              </tr>
            )}
            {topDebtors.map((row) => (
              <tr key={row.email}>
                <td className="py-2 text-slate-900">{row.name}</td>
                <td className="py-2 text-slate-500">{row.email}</td>
                <td className="py-2 text-right text-amber-600">{money(row.outstanding)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}
