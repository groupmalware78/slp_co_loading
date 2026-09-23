"use client";

import { useState, type FormEvent } from "react";

interface Fields {
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankRoutingNumber: string;
  bankBranch: string;
  paymentDueDays: string;
}

function toFields(initial: {
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankRoutingNumber: string | null;
  bankBranch: string | null;
  paymentDueDays: number | null;
} | null): Fields {
  return {
    bankName: initial?.bankName ?? "",
    bankAccountName: initial?.bankAccountName ?? "",
    bankAccountNumber: initial?.bankAccountNumber ?? "",
    bankRoutingNumber: initial?.bankRoutingNumber ?? "",
    bankBranch: initial?.bankBranch ?? "",
    paymentDueDays: initial?.paymentDueDays != null ? String(initial.paymentDueDays) : "",
  };
}

export function BankingSettingsForm({
  initial,
}: {
  initial: {
    bankName: string | null;
    bankAccountName: string | null;
    bankAccountNumber: string | null;
    bankRoutingNumber: string | null;
    bankBranch: string | null;
    paymentDueDays: number | null;
  } | null;
}) {
  const [fields, setFields] = useState<Fields>(toFields(initial));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: keyof Fields, value: string) {
    setSuccess(false);
    setFields((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const res = await fetch("/api/platform-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bankName: fields.bankName || null,
        bankAccountName: fields.bankAccountName || null,
        bankAccountNumber: fields.bankAccountNumber || null,
        bankRoutingNumber: fields.bankRoutingNumber || null,
        bankBranch: fields.bankBranch || null,
        paymentDueDays: fields.paymentDueDays === "" ? null : Number(fields.paymentDueDays),
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save banking info.");
      return;
    }
    setFields(toFields(data.settings));
    setSuccess(true);
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Banking info saved.
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Banking information</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Printed on the manifest billing invoice sent to freight forwarder companies.
          </p>
        </div>

        <div>
          <label htmlFor="bankName" className="mb-1 block text-sm font-medium text-slate-700">
            Bank name
          </label>
          <input
            id="bankName"
            value={fields.bankName}
            onChange={(e) => updateField("bankName", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="bankAccountName" className="mb-1 block text-sm font-medium text-slate-700">
            Account name
          </label>
          <input
            id="bankAccountName"
            value={fields.bankAccountName}
            onChange={(e) => updateField("bankAccountName", e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="bankAccountNumber" className="mb-1 block text-sm font-medium text-slate-700">
              Account number
            </label>
            <input
              id="bankAccountNumber"
              value={fields.bankAccountNumber}
              onChange={(e) => updateField("bankAccountNumber", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="bankRoutingNumber" className="mb-1 block text-sm font-medium text-slate-700">
              Routing number
            </label>
            <input
              id="bankRoutingNumber"
              value={fields.bankRoutingNumber}
              onChange={(e) => updateField("bankRoutingNumber", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="bankBranch" className="mb-1 block text-sm font-medium text-slate-700">
            Branch
          </label>
          <input
            id="bankBranch"
            value={fields.bankBranch}
            onChange={(e) => updateField("bankBranch", e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="border-t border-slate-100 pt-4">
          <label htmlFor="paymentDueDays" className="mb-1 block text-sm font-medium text-slate-700">
            Payment due (days)
          </label>
          <input
            id="paymentDueDays"
            inputMode="numeric"
            placeholder="Leave blank for no due date"
            value={fields.paymentDueDays}
            onChange={(e) => updateField("paymentDueDays", e.target.value.replace(/[^0-9]/g, ""))}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            e.g. 30 for Net 30 — applied to every invoice generated from now on. Leave blank to
            omit a due date from generated invoices.
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Save banking info"}
      </button>
    </form>
  );
}
