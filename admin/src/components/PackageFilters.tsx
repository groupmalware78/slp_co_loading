"use client";

import { PACKAGE_STATUSES, STATUS_LABELS } from "./PackageStatusBadge";

export interface PackageFilterValues {
  companyId: string;
  receivedById: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_PACKAGE_FILTERS: PackageFilterValues = {
  companyId: "",
  receivedById: "",
  status: "",
  dateFrom: "",
  dateTo: "",
};

export function PackageFilters({
  filters,
  companies,
  users,
  onChange,
}: {
  filters: PackageFilterValues;
  companies: { id: string; name: string }[];
  users: { id: string; name: string }[];
  onChange: (filters: PackageFilterValues) => void;
}) {
  const selectClass =
    "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

  function update<K extends keyof PackageFilterValues>(key: K, value: string) {
    onChange({ ...filters, [key]: value });
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div>
        <label htmlFor="filter-company" className="mb-1 block text-xs font-medium text-slate-500">
          Company
        </label>
        <select
          id="filter-company"
          value={filters.companyId}
          onChange={(e) => update("companyId", e.target.value)}
          className={selectClass}
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-user" className="mb-1 block text-xs font-medium text-slate-500">
          Received by
        </label>
        <select
          id="filter-user"
          value={filters.receivedById}
          onChange={(e) => update("receivedById", e.target.value)}
          className={selectClass}
        >
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-status" className="mb-1 block text-xs font-medium text-slate-500">
          Status
        </label>
        <select
          id="filter-status"
          value={filters.status}
          onChange={(e) => update("status", e.target.value)}
          className={selectClass}
        >
          <option value="">All statuses</option>
          {PACKAGE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-date-from" className="mb-1 block text-xs font-medium text-slate-500">
          Received from
        </label>
        <input
          id="filter-date-from"
          type="date"
          value={filters.dateFrom}
          onChange={(e) => update("dateFrom", e.target.value)}
          className={selectClass}
        />
      </div>

      <div>
        <label htmlFor="filter-date-to" className="mb-1 block text-xs font-medium text-slate-500">
          Received to
        </label>
        <input
          id="filter-date-to"
          type="date"
          value={filters.dateTo}
          onChange={(e) => update("dateTo", e.target.value)}
          className={selectClass}
        />
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_PACKAGE_FILTERS)}
          className="rounded-md px-2 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
