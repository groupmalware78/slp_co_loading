"use client";

import { useState } from "react";

interface CompanyRow {
  id: string;
  name: string;
  code: string;
  perPackageRate: number;
}

export function RatesView({ initialCompanies }: { initialCompanies: CompanyRow[] }) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function draftFor(company: CompanyRow): string {
    return drafts[company.id] ?? String(company.perPackageRate);
  }

  function isDirty(company: CompanyRow): boolean {
    const draft = drafts[company.id];
    return draft !== undefined && draft !== String(company.perPackageRate);
  }

  async function handleSave(company: CompanyRow) {
    const value = Number(drafts[company.id]);
    if (Number.isNaN(value) || value < 0) {
      setError("Rate must be a number of 0 or more.");
      return;
    }
    setSavingId(company.id);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${company.id}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perPackageRate: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save rate.");
        return;
      }
      setCompanies((prev) => prev.map((c) => (c.id === company.id ? data.company : c)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[company.id];
        return next;
      });
    } finally {
      setSavingId(null);
    }
  }

  const inputClass =
    "w-32 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Rates</h1>
        <p className="text-sm text-slate-500">
          Each company&apos;s per-package billing rate — used by Manifests&apos; &quot;Generate
          invoice&quot; (packages × rate). Distinct from a company&apos;s own weight-based shipping
          rates, which it configures for its own customers.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {companies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">No companies added yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Per-package rate ($)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((c) => (
                <tr key={c.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">
                    {c.name}
                    <span className="ml-1 font-mono text-xs text-slate-400">{c.code}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draftFor(c)}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      className={inputClass}
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSave(c)}
                      disabled={!isDirty(c) || savingId === c.id}
                      className="text-xs font-medium text-teal-700 transition hover:text-teal-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {savingId === c.id ? "Saving…" : "Save"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
