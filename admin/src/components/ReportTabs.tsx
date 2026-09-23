"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const TABS = [
  { href: "/dashboard/reports/financial", label: "Financial" },
  { href: "/dashboard/reports/customers", label: "Customers" },
  { href: "/dashboard/reports/packages", label: "Packages" },
];

export function ReportTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-slate-200">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={clsx(
            "border-b-2 px-3 py-2 text-sm font-medium transition",
            pathname === tab.href
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
