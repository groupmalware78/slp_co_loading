"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { Pager } from "./Pager";

type EntityType = "PACKAGE" | "COMPANY" | "CUSTOMER" | "USER";
type ActionType = "CREATE" | "UPDATE" | "DELETE";

interface AuditLogEntry {
  id: string;
  entityType: EntityType;
  entityId: string;
  action: ActionType;
  changes: { before: Record<string, unknown> | null; after: Record<string, unknown> | null } | null;
  createdAt: string;
  performedBy: { id: string; name: string; role: string } | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const ENTITY_LABELS: Record<EntityType, string> = {
  PACKAGE: "Package",
  COMPANY: "Company",
  CUSTOMER: "Customer",
  USER: "User",
};

const ACTION_STYLES: Record<ActionType, string> = {
  CREATE: "bg-green-50 text-green-700 ring-green-600/20",
  UPDATE: "bg-blue-50 text-blue-700 ring-blue-600/20",
  DELETE: "bg-red-50 text-red-700 ring-red-600/20",
};

function ActionBadge({ action }: { action: ActionType }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        ACTION_STYLES[action]
      )}
    >
      {action.charAt(0) + action.slice(1).toLowerCase()}
    </span>
  );
}

function ChangesModal({ entry, onClose }: { entry: AuditLogEntry; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            {ENTITY_LABELS[entry.entityType]} {entry.action.toLowerCase()} — {new Date(entry.createdAt).toLocaleString()}
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
        <div className="grid grid-cols-2 gap-4 px-5 py-5">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Before</p>
            <pre className="max-h-80 overflow-auto rounded-md bg-slate-50 p-3 text-xs text-slate-700">
              {entry.changes?.before ? JSON.stringify(entry.changes.before, null, 2) : "—"}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">After</p>
            <pre className="max-h-80 overflow-auto rounded-md bg-slate-50 p-3 text-xs text-slate-700">
              {entry.changes?.after ? JSON.stringify(entry.changes.after, null, 2) : "—"}
            </pre>
          </div>
        </div>
        <div className="flex justify-end border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function AuditLogView({
  initialLogs,
  initialPagination,
}: {
  initialLogs: AuditLogEntry[];
  initialPagination: Pagination;
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [pagination, setPagination] = useState(initialPagination);
  const [entityFilter, setEntityFilter] = useState<EntityType | "">("");
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const fetchPage = useCallback(async (page: number, filter: EntityType | "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(initialPagination.pageSize));
      if (filter) params.set("entityType", filter);
      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data.logs as AuditLogEntry[]);
      setPagination(data.pagination as Pagination);
    } finally {
      setLoading(false);
    }
  }, [initialPagination.pageSize]);

  function handleFilterChange(value: EntityType | "") {
    setEntityFilter(value);
    fetchPage(1, value);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Log</h1>
          <p className="text-sm text-slate-500">
            A record of create, update, and delete actions across the system.
          </p>
        </div>
        <select
          value={entityFilter}
          onChange={(e) => handleFilterChange(e.target.value as EntityType | "")}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        >
          <option value="">All entities</option>
          {(Object.entries(ENTITY_LABELS) as [EntityType, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">No audit log entries yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Performed by</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">
                    {ENTITY_LABELS[entry.entityType]}
                    <span className="ml-1 font-mono text-xs text-slate-400">{entry.entityId.slice(0, 10)}…</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <ActionBadge action={entry.action} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {entry.performedBy?.name ?? <span className="text-slate-400">System</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedEntry(entry)}
                      className="text-xs font-medium text-slate-600 transition hover:text-slate-900"
                    >
                      View changes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onPageChange={(page) => fetchPage(page, entityFilter)}
            disabled={loading}
          />
        </div>
      )}

      {selectedEntry && (
        <ChangesModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
}
