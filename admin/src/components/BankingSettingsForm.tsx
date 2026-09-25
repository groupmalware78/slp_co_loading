"use client";

import { useState, type FormEvent } from "react";

interface BankAccount {
  id: string;
  label: string | null;
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber: string | null;
  branch: string | null;
  active: boolean;
}

const emptyAccountForm = {
  label: "",
  bankName: "",
  accountName: "",
  accountNumber: "",
  routingNumber: "",
  branch: "",
};

function DueDaysForm({ initial }: { initial: number | null }) {
  const [value, setValue] = useState(initial != null ? String(initial) : "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const res = await fetch("/api/platform-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentDueDays: value === "" ? null : Number(value) }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save.");
      return;
    }
    setSuccess(true);
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</div>
      )}
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Invoice due date</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Net payment terms applied to every manifest invoice generated from now on.
        </p>
      </div>
      <div>
        <label htmlFor="paymentDueDays" className="mb-1 block text-sm font-medium text-slate-700">
          Payment due (days)
        </label>
        <input
          id="paymentDueDays"
          inputMode="numeric"
          placeholder="Leave blank for no due date"
          value={value}
          onChange={(e) => {
            setSuccess(false);
            setValue(e.target.value.replace(/[^0-9]/g, ""));
          }}
          className={`max-w-xs ${inputClass}`}
        />
        <p className="mt-1 text-xs text-slate-500">e.g. 30 for Net 30. Leave blank to omit a due date.</p>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md shadow-violet-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

function BankAccountForm({
  onSaved,
  onCancel,
}: {
  onSaved: (account: BankAccount) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState(emptyAccountForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof emptyAccountForm, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/bank-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: fields.label || null,
        bankName: fields.bankName,
        accountName: fields.accountName,
        accountNumber: fields.accountNumber,
        routingNumber: fields.routingNumber || null,
        branch: fields.branch || null,
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to add bank account.");
      return;
    }
    onSaved(data.bankAccount);
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
    >
      <p className="col-span-full text-sm font-medium text-slate-700">New bank account</p>
      {error && (
        <div className="col-span-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <input
        placeholder="Label (e.g. USD account)"
        value={fields.label}
        onChange={(e) => update("label", e.target.value)}
        className={inputClass}
      />
      <input
        required
        placeholder="Bank name"
        value={fields.bankName}
        onChange={(e) => update("bankName", e.target.value)}
        className={inputClass}
      />
      <input
        required
        placeholder="Account name"
        value={fields.accountName}
        onChange={(e) => update("accountName", e.target.value)}
        className={inputClass}
      />
      <input
        required
        placeholder="Account number"
        value={fields.accountNumber}
        onChange={(e) => update("accountNumber", e.target.value)}
        className={inputClass}
      />
      <input
        placeholder="Routing number"
        value={fields.routingNumber}
        onChange={(e) => update("routingNumber", e.target.value)}
        className={inputClass}
      />
      <input
        placeholder="Branch"
        value={fields.branch}
        onChange={(e) => update("branch", e.target.value)}
        className={inputClass}
      />
      <div className="col-span-full flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md shadow-violet-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60"
        >
          {submitting ? "Adding…" : "Add account"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function BankAccountRow({
  account,
  onChanged,
  onDeleted,
}: {
  account: BankAccount;
  onChanged: (account: BankAccount) => void;
  onDeleted: (id: string) => void;
}) {
  const [savingActive, setSavingActive] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleToggleActive(active: boolean) {
    setSavingActive(true);
    try {
      const res = await fetch(`/api/bank-accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (res.ok) {
        const data = await res.json();
        onChanged(data.bankAccount);
      }
    } finally {
      setSavingActive(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Remove "${account.label || account.bankName}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/bank-accounts/${account.id}`, { method: "DELETE" });
      if (res.ok) onDeleted(account.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <tr className="hover:bg-slate-50">
      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">
        {account.label || <span className="text-slate-400">—</span>}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{account.bankName}</td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{account.accountName}</td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-slate-600">{account.accountNumber}</td>
      <td className="whitespace-nowrap px-4 py-3">
        <label className="inline-flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={account.active}
            disabled={savingActive}
            onChange={(e) => handleToggleActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          {account.active ? "Active" : "Inactive"}
        </label>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-medium text-red-600 transition hover:text-red-800 disabled:opacity-50"
        >
          {deleting ? "Removing…" : "Remove"}
        </button>
      </td>
    </tr>
  );
}

export function BankingSettingsForm({
  initialSettings,
  initialBankAccounts,
}: {
  initialSettings: { paymentDueDays: number | null } | null;
  initialBankAccounts: BankAccount[];
}) {
  const [accounts, setAccounts] = useState(initialBankAccounts);
  const [showAddForm, setShowAddForm] = useState(false);

  function handleAccountAdded(account: BankAccount) {
    setAccounts((prev) => [...prev, account]);
    setShowAddForm(false);
  }

  function handleAccountChanged(account: BankAccount) {
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)));
  }

  function handleAccountDeleted(id: string) {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Bank accounts</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Every active account is printed on manifest billing invoices.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md shadow-violet-600/20 px-3 py-2 text-sm font-medium text-white transition hover:from-violet-500 hover:to-fuchsia-500"
          >
            {showAddForm ? "Cancel" : "Add bank account"}
          </button>
        </div>

        {showAddForm && (
          <BankAccountForm onSaved={handleAccountAdded} onCancel={() => setShowAddForm(false)} />
        )}

        {accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
            <p className="text-sm text-slate-500">No bank accounts added yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Label</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Bank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Account name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Account number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((account) => (
                  <BankAccountRow
                    key={account.id}
                    account={account}
                    onChanged={handleAccountChanged}
                    onDeleted={handleAccountDeleted}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DueDaysForm initial={initialSettings?.paymentDueDays ?? null} />
    </div>
  );
}
