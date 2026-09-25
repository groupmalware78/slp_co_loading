"use client";

import { useState } from "react";

interface ApiKeyStatus {
  apiKeyPrefix: string;
  apiKeyScope: "FULL" | "READ_ONLY";
  rotatedAt: string;
  rotationDays: number;
  usedPreviousKey: boolean;
  gracePeriodEndsAt: string | null;
}

export function ApiKeyRotationForm({ initial }: { initial: ApiKeyStatus }) {
  const [status, setStatus] = useState(initial);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [justRotated, setJustRotated] = useState<{
    apiKey: string;
    persisted: boolean;
  } | null>(null);

  async function handleRotate() {
    if (
      !window.confirm(
        "Rotate this deployment's API key? The old key keeps working for 48 hours while this app switches over, then stops."
      )
    )
      return;

    setRotating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/api-key/rotate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to rotate API key.");
        return;
      }
      setJustRotated({ apiKey: data.apiKey, persisted: data.persisted });
      setStatus((prev) => ({
        ...prev,
        apiKeyPrefix: data.apiKeyPrefix,
        rotatedAt: data.rotatedAt,
        gracePeriodEndsAt: data.gracePeriodEndsAt,
        usedPreviousKey: false,
      }));
    } finally {
      setRotating(false);
    }
  }

  async function handleCopy(key: string) {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {status.usedPreviousKey && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This request authenticated with a grace-period key from a recent rotation. Rotate again
          soon, or confirm this app has picked up the current key.
        </div>
      )}

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {justRotated && (
        <div className="space-y-2 rounded-md bg-slate-900 px-3 py-3 text-sm text-white">
          <p className="font-medium">New API key — copy it now, it won&apos;t be shown again:</p>
          <div className="flex items-center gap-2">
            <code className="truncate rounded bg-white/10 px-2 py-1 font-mono text-xs">
              {justRotated.apiKey}
            </code>
            <button
              type="button"
              onClick={() => handleCopy(justRotated.apiKey)}
              className="shrink-0 text-xs font-medium underline"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          {!justRotated.persisted && (
            <p className="text-xs text-amber-300">
              Couldn&apos;t save this automatically — paste it into this deployment&apos;s
              TENANT_API_KEY in .env and restart, or this app will keep using the old key until
              its grace period ends.
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Current key</dt>
            <dd className="font-mono text-slate-900">{status.apiKeyPrefix}…</dd>
          </div>
          <div>
            <dt className="text-slate-500">Scope</dt>
            <dd className="text-slate-900">{status.apiKeyScope === "FULL" ? "Full access" : "Read-only"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Last rotated</dt>
            <dd className="text-slate-900">{new Date(status.rotatedAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Automatic rotation</dt>
            <dd className="text-slate-900">
              {status.rotationDays === 0 ? "Off" : `Every ${status.rotationDays} days`}
            </dd>
          </div>
          {status.gracePeriodEndsAt && (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Old key valid until</dt>
              <dd className="text-slate-900">{new Date(status.gracePeriodEndsAt).toLocaleString()}</dd>
            </div>
          )}
        </dl>
        <button
          type="button"
          onClick={handleRotate}
          disabled={rotating || status.apiKeyScope === "READ_ONLY"}
          className="mt-4 rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500 disabled:opacity-60"
        >
          {rotating ? "Rotating…" : "Rotate key"}
        </button>
        {status.apiKeyScope === "READ_ONLY" && (
          <p className="mt-2 text-xs text-slate-500">
            A read-only key can&apos;t self-rotate — contact the Service-Provider to rotate it.
          </p>
        )}
      </div>
    </div>
  );
}
