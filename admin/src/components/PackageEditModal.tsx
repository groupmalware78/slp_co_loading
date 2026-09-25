"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { PackageStatus, PackageType } from "@prisma/client";
import type { PackageWithRelations } from "@/types/package";
import { PACKAGE_STATUSES, STATUS_LABELS } from "./PackageStatusBadge";
import { PACKAGE_TYPE_VALUES, PACKAGE_TYPE_LABELS } from "@/lib/packageSchema";
import { SearchableSelect, type SearchableSelectOption } from "./SearchableSelect";

export function PackageEditModal({
  pkg,
  canEdit,
  canPrintLabel,
  onClose,
  onUpdated,
}: {
  pkg: PackageWithRelations;
  canEdit: boolean;
  canPrintLabel: boolean;
  onClose: () => void;
  onUpdated?: (pkg: PackageWithRelations) => void;
}) {
  const [trackingNumber, setTrackingNumber] = useState(pkg.trackingNumber);
  const [status, setStatus] = useState<PackageStatus>(pkg.status);
  const [packageType, setPackageType] = useState<PackageType>(pkg.packageType);
  const [pieces, setPieces] = useState(String(pkg.pieces));
  const [companyId, setCompanyId] = useState<string | null>(pkg.company?.id ?? null);
  const [customerId, setCustomerId] = useState<string | null>(pkg.customer?.id ?? null);
  const [weight, setWeight] = useState(pkg.weightLbs != null ? String(pkg.weightLbs) : "");
  const [description, setDescription] = useState(pkg.description ?? "");
  const [companies, setCompanies] = useState<SearchableSelectOption[]>([]);
  const [customers, setCustomers] = useState<
    { id: string; name: string; companyId: string | null; customerCode: string | null }[]
  >([]);
  const [loadingDirectories, setLoadingDirectories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    async function loadDirectories() {
      try {
        const [companiesRes, customersRes] = await Promise.all([
          fetch("/api/companies"),
          fetch("/api/customers"),
        ]);
        if (companiesRes.ok) {
          const data = await companiesRes.json();
          setCompanies(
            data.companies.map((c: { id: string; name: string; code: string }) => ({
              id: c.id,
              label: c.name,
              sublabel: c.code,
            }))
          );
        }
        if (customersRes.ok) {
          const data = await customersRes.json();
          setCustomers(
            data.customers.map(
              (c: {
                id: string;
                name: string;
                companyId: string | null;
                customerCode: string | null;
              }) => ({
                id: c.id,
                name: c.name,
                companyId: c.companyId,
                customerCode: c.customerCode,
              })
            )
          );
        }
      } finally {
        setLoadingDirectories(false);
      }
    }
    loadDirectories();
  }, []);

  const customerOptions: SearchableSelectOption[] = customers
    .filter((c) => !companyId || c.companyId === companyId)
    .map((c) => ({ id: c.id, label: c.name, sublabel: c.customerCode ?? undefined }));

  function handleCompanyChange(nextCompanyId: string | null) {
    setCompanyId(nextCompanyId);
    // Selecting a customer that doesn't belong to the newly chosen company
    // no longer makes sense — clear it rather than leave a stale mismatch.
    if (nextCompanyId && customerId) {
      const selected = customers.find((c) => c.id === customerId);
      if (selected && selected.companyId !== nextCompanyId) {
        setCustomerId(null);
      }
    }
  }

  function handleCustomerChange(nextCustomerId: string | null) {
    setCustomerId(nextCustomerId);
    const selected = customers.find((c) => c.id === nextCustomerId);
    if (selected?.companyId) {
      setCompanyId(selected.companyId);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/packages/${pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackingNumber,
        status,
        packageType,
        pieces: pieces.trim() ? Number(pieces) : undefined,
        companyId,
        customerId,
        weightLbs: weight.trim() ? Number(weight) : undefined,
        description: description.trim() || undefined,
        // Payment status/amount aren't editable from this modal — pass the
        // package's current values through unchanged so saving other fields
        // here doesn't fall back to the schema's defaults and reset them.
        paymentStatus: pkg.paymentStatus,
        amountPaid: pkg.amountPaid ?? undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save changes.");
      return;
    }

    onUpdated?.(data.package as PackageWithRelations);
    onClose();
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:bg-slate-50 disabled:text-slate-500";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="package-edit-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="package-edit-title" className="font-mono text-base font-semibold text-slate-900">
            {pkg.trackingNumber}
          </h2>
          <div className="flex items-center gap-3">
            {canPrintLabel && (
              <a
                href={`/labels/${pkg.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-emerald-200"
              >
                Print Label
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 px-5 py-5">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-tracking" className="mb-1 block text-sm font-medium text-slate-700">
                Tracking number
              </label>
              <input
                id="edit-tracking"
                type="text"
                disabled={!canEdit}
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className={`font-mono ${inputClass}`}
              />
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">HAWB</span>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-600">
                {pkg.hawb}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Company</label>
              <SearchableSelect
                options={companies}
                value={companyId}
                onChange={handleCompanyChange}
                placeholder={loadingDirectories ? "Loading…" : "Select a company"}
                emptyMessage="No companies yet"
                disabled={!canEdit || loadingDirectories}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Customer</label>
              <SearchableSelect
                options={customerOptions}
                value={customerId}
                onChange={handleCustomerChange}
                placeholder={loadingDirectories ? "Loading…" : "Select a customer"}
                emptyMessage={companyId ? "No customers for this company" : "No customers yet"}
                disabled={!canEdit || loadingDirectories}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-status" className="mb-1 block text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                id="edit-status"
                disabled={!canEdit}
                value={status}
                onChange={(e) => setStatus(e.target.value as PackageStatus)}
                className={inputClass}
              >
                {PACKAGE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-package-type" className="mb-1 block text-sm font-medium text-slate-700">
                Package type
              </label>
              <select
                id="edit-package-type"
                disabled={!canEdit}
                value={packageType}
                onChange={(e) => setPackageType(e.target.value as PackageType)}
                className={inputClass}
              >
                {PACKAGE_TYPE_VALUES.map((t) => (
                  <option key={t} value={t}>
                    {PACKAGE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-pieces" className="mb-1 block text-sm font-medium text-slate-700">
                No. of pieces
              </label>
              <input
                id="edit-pieces"
                type="number"
                disabled={!canEdit}
                inputMode="numeric"
                min="1"
                step="1"
                value={pieces}
                onChange={(e) => setPieces(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="edit-weight" className="mb-1 block text-sm font-medium text-slate-700">
                Weight (lbs)
              </label>
              <input
                id="edit-weight"
                type="number"
                disabled={!canEdit}
                inputMode="decimal"
                min="0"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-description" className="mb-1 block text-sm font-medium text-slate-700">
              Description (STC)
            </label>
            <input
              id="edit-description"
              type="text"
              disabled={!canEdit}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Received by</p>
              <p className="mt-1 text-slate-600">{pkg.receivedBy?.name ?? "Not yet received"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Received at</p>
              <p className="mt-1 text-slate-600">
                {pkg.receivedAt ? new Date(pkg.receivedAt).toLocaleString() : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Last updated</p>
              <p className="mt-1 text-slate-600">{new Date(pkg.updatedAt).toLocaleString()}</p>
            </div>
          </div>

          {(pkg.merchantName || pkg.additionalDetails) && (
            <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-sm">
              {pkg.merchantName && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Merchant / Seller
                  </p>
                  <p className="mt-1 text-slate-600">{pkg.merchantName}</p>
                </div>
              )}
              {pkg.additionalDetails && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Additional details (from customer)
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-600">{pkg.additionalDetails}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            >
              {canEdit ? "Cancel" : "Close"}
            </button>
            {canEdit && (
              <button
                type="submit"
                disabled={submitting || !trackingNumber.trim()}
                className="rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md shadow-violet-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Save changes"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
