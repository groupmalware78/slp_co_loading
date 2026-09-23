"use client";

import { useState } from "react";
import type { PackageWithRelations } from "@/types/package";
import { PackageStatusBadge } from "./PackageStatusBadge";
import type { SortablePackageField } from "@/lib/packageSchema";

const COLUMNS: { field: SortablePackageField; label: string }[] = [
  { field: "trackingNumber", label: "Tracking number" },
  { field: "company", label: "Company" },
  { field: "receivedBy", label: "Received by" },
  { field: "receivedAt", label: "Received at" },
  { field: "status", label: "Status" },
  { field: "updatedAt", label: "Last updated" },
];

function SortHeader({
  field,
  label,
  sortBy,
  sortDir,
  onSort,
}: {
  field: SortablePackageField;
  label: string;
  sortBy: SortablePackageField;
  sortDir: "asc" | "desc";
  onSort?: (field: SortablePackageField) => void;
}) {
  const active = sortBy === field;
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {onSort ? (
        <button
          type="button"
          onClick={() => onSort(field)}
          className={`inline-flex items-center gap-1 transition hover:text-slate-900 ${
            active ? "text-slate-900" : ""
          }`}
        >
          {label}
          <span className="text-slate-400">
            {active ? (sortDir === "asc" ? "▲" : "▼") : ""}
          </span>
        </button>
      ) : (
        label
      )}
    </th>
  );
}

export function PackageList({
  packages,
  canDelete = false,
  onDelete,
  onSelect,
  footer,
  sortBy = "receivedAt",
  sortDir = "desc",
  onSort,
}: {
  packages: PackageWithRelations[];
  canDelete?: boolean;
  onDelete?: (id: string) => Promise<void>;
  onSelect?: (pkg: PackageWithRelations) => void;
  footer?: React.ReactNode;
  sortBy?: SortablePackageField;
  sortDir?: "asc" | "desc";
  onSort?: (field: SortablePackageField) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (packages.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white">
        <p className="py-16 text-center text-sm text-slate-500">No packages logged yet.</p>
        {footer}
      </div>
    );
  }

  async function handleDelete(pkg: PackageWithRelations) {
    if (!onDelete) return;
    if (!window.confirm(`Delete package ${pkg.trackingNumber}? This cannot be undone.`)) {
      return;
    }
    setDeletingId(pkg.id);
    try {
      await onDelete(pkg.id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {COLUMNS.map((col) => (
              <SortHeader
                key={col.field}
                field={col.field}
                label={col.label}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            ))}
            {canDelete && (
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {packages.map((pkg) => (
            <tr
              key={pkg.id}
              onClick={() => onSelect?.(pkg)}
              className={onSelect ? "cursor-pointer hover:bg-slate-50" : "hover:bg-slate-50"}
            >
              <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-slate-900">
                {pkg.trackingNumber}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                {pkg.company?.name ?? <span className="text-slate-400">—</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                {pkg.receivedBy?.name ?? <span className="text-slate-400">—</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                {pkg.receivedAt ? (
                  new Date(pkg.receivedAt).toLocaleString()
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <PackageStatusBadge status={pkg.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                {new Date(pkg.updatedAt).toLocaleString()}
              </td>
              {canDelete && (
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(pkg);
                    }}
                    disabled={deletingId === pkg.id}
                    className="text-xs font-medium text-red-600 transition hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === pkg.id ? "Deleting…" : "Delete"}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {footer}
    </div>
  );
}
