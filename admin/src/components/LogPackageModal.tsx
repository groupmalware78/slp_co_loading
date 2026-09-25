"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { PackageStatus } from "@prisma/client";
import { BarcodeCameraScanner } from "./BarcodeCameraScanner";
import { PACKAGE_STATUSES, STATUS_LABELS } from "./PackageStatusBadge";
import type { PackageWithRelations } from "@/types/package";

interface LoggedEntry {
  id: string;
  trackingNumber: string;
  status: PackageStatus;
  receivedAt: string | null;
}

export function LogPackageModal({
  currentUserName,
  initialTrackingNumber,
  onClose,
  onPackageLogged,
}: {
  currentUserName: string;
  // Prefilled when handed off from LocatePackageModal's "not found" state
  // (a scanned code with no existing package match).
  initialTrackingNumber?: string;
  onClose: () => void;
  onPackageLogged: (pkg: PackageWithRelations) => void;
}) {
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber ?? "");
  const [status, setStatus] = useState<PackageStatus>("RECEIVED");
  const [now, setNow] = useState(() => new Date());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionLog, setSessionLog] = useState<LoggedEntry[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitTrackingNumber(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: trimmed,
          status,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to log package.");
        return;
      }

      const pkg = data.package as PackageWithRelations;
      onPackageLogged(pkg);
      setSessionLog((prev) => [
        { id: pkg.id, trackingNumber: pkg.trackingNumber, status: pkg.status, receivedAt: pkg.receivedAt },
        ...prev,
      ]);
      setTrackingNumber("");
      setStatus("RECEIVED");
    } catch {
      setError("Network error — could not reach the server.");
    } finally {
      setSubmitting(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submitTrackingNumber(trackingNumber);
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Hardware barcode scanners act as a keyboard and send Enter after the scan.
    if (e.key === "Enter") {
      e.preventDefault();
      submitTrackingNumber(trackingNumber);
    }
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-package-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="log-package-title" className="text-base font-semibold text-slate-900">
            Log received package
          </h2>
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

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="trackingNumber" className="mb-1 block text-sm font-medium text-slate-700">
              Tracking number
            </label>
            <input
              ref={inputRef}
              id="trackingNumber"
              type="text"
              autoComplete="off"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Scan or type tracking number, then press Enter"
              className={`font-mono ${inputClass}`}
            />
            <button
              type="button"
              onClick={() => setCameraOpen((v) => !v)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              {cameraOpen ? "Hide camera scanner" : "Scan with camera instead"}
            </button>
            {cameraOpen && (
              <div className="mt-2">
                <BarcodeCameraScanner
                  onDetected={(value) => {
                    setCameraOpen(false);
                    setTrackingNumber(value);
                    submitTrackingNumber(value);
                  }}
                  onClose={() => setCameraOpen(false)}
                />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="status" className="mb-1 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              id="status"
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Received by
              </span>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {currentUserName}
              </div>
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Date &amp; time received
              </span>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-600">
                {now.toLocaleString()}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Company, customer, package type, pieces, weight, and description can be added
            afterward by editing the package.
          </p>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            >
              Done — close
            </button>
            <button
              type="submit"
              disabled={submitting || !trackingNumber.trim()}
              className="rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md shadow-violet-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Logging…" : "Log package"}
            </button>
          </div>
        </form>

        {sessionLog.length > 0 && (
          <div className="max-h-40 overflow-y-auto border-t border-slate-200 px-5 py-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              Logged this session ({sessionLog.length})
            </p>
            <ul className="space-y-1">
              {sessionLog.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-mono">{entry.trackingNumber}</span>
                  <span className="text-slate-400">{STATUS_LABELS[entry.status]}</span>
                  <span className="text-slate-400">
                    {entry.receivedAt ? new Date(entry.receivedAt).toLocaleTimeString() : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
