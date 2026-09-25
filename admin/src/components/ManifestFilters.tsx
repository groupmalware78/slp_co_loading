"use client";

export interface ManifestFilterValues {
  companyId: string;
  dateFrom: string;
  dateTo: string;
  invoiceGenerated: string;
}

export const EMPTY_MANIFEST_FILTERS: ManifestFilterValues = {
  companyId: "",
  dateFrom: "",
  dateTo: "",
  invoiceGenerated: "",
};

export function ManifestFilters({
  filters,
  companies,
  onChange,
}: {
  filters: ManifestFilterValues;
  companies: { id: string; name: string }[];
  onChange: (filters: ManifestFilterValues) => void;
}) {
  const selectClass =
    "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

  function update<K extends keyof ManifestFilterValues>(key: K, value: string) {
    onChange({ ...filters, [key]: value });
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div>
        <label htmlFor="filter-manifest-company" className="mb-1 block text-xs font-medium text-slate-500">
          Company
        </label>
        <select
          id="filter-manifest-company"
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
        <label htmlFor="filter-manifest-date-from" className="mb-1 block text-xs font-medium text-slate-500">
          Generated from
        </label>
        <input
          id="filter-manifest-date-from"
          type="date"
          value={filters.dateFrom}
          onChange={(e) => update("dateFrom", e.target.value)}
          className={selectClass}
        />
      </div>

      <div>
        <label htmlFor="filter-manifest-date-to" className="mb-1 block text-xs font-medium text-slate-500">
          Generated to
        </label>
        <input
          id="filter-manifest-date-to"
          type="date"
          value={filters.dateTo}
          onChange={(e) => update("dateTo", e.target.value)}
          className={selectClass}
        />
      </div>

      <div>
        <label htmlFor="filter-manifest-invoice" className="mb-1 block text-xs font-medium text-slate-500">
          Invoice
        </label>
        <select
          id="filter-manifest-invoice"
          value={filters.invoiceGenerated}
          onChange={(e) => update("invoiceGenerated", e.target.value)}
          className={selectClass}
        >
          <option value="">All</option>
          <option value="yes">Generated</option>
          <option value="no">Not generated</option>
        </select>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_MANIFEST_FILTERS)}
          className="rounded-md px-2 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
