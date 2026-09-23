"use client";

import { useState, type FormEvent } from "react";

export function RatesView({ initialRate }: { initialRate: number }) {
  const [rate, setRate] = useState(String(initialRate));
  const [savedRate, setSavedRate] = useState(initialRate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isDirty = rate !== String(savedRate);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(rate);
    if (Number.isNaN(value) || value < 0) {
      setError("Rate must be a number of 0 or more.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/platform-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perPackageRate: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save rate.");
        return;
      }
      setSavedRate(data.settings.perPackageRate);
      setRate(String(data.settings.perPackageRate));
      setSuccess(true);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-40 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Rates</h1>
        <p className="text-sm text-slate-500">
          The platform&apos;s per-package billing rate, applied to every company alike — used by
          Manifests&apos; &quot;Generate invoice&quot; (packages × rate). Distinct from a
          company&apos;s own weight-based shipping rates, which it configures for its own
          customers.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {success && (
          <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</div>
        )}
        <div>
          <label htmlFor="perPackageRate" className="mb-1 block text-sm font-medium text-slate-700">
            Per-package rate ($)
          </label>
          <input
            id="perPackageRate"
            type="number"
            min="0"
            step="0.01"
            value={rate}
            onChange={(e) => {
              setSuccess(false);
              setRate(e.target.value);
            }}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={!isDirty || saving}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
