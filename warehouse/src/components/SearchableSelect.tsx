"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

export interface SearchableSelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search…",
  emptyMessage = "No matches",
  allowCreate = false,
  onCreate,
  disabled = false,
}: {
  options: SearchableSelectOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  emptyMessage?: string;
  allowCreate?: boolean;
  onCreate?: (name: string) => Promise<SearchableSelectOption | null>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value) ?? null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.sublabel?.toLowerCase().includes(q)
    );
  }, [options, query]);

  const exactMatch = options.some(
    (o) => o.label.trim().toLowerCase() === query.trim().toLowerCase()
  );

  async function handleCreate() {
    if (!onCreate || !query.trim() || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(query.trim());
      if (created) {
        onChange(created.id);
        setOpen(false);
        setQuery("");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500",
          disabled && "cursor-not-allowed bg-slate-50 text-slate-400",
          !disabled && (selected ? "text-slate-900" : "text-slate-400")
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-slate-400">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {selected && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-slate-400 hover:bg-slate-50"
                >
                  Clear selection
                </button>
              </li>
            )}
            {filtered.length === 0 && !allowCreate && (
              <li className="px-3 py-2 text-sm text-slate-400">{emptyMessage}</li>
            )}
            {filtered.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={clsx(
                    "w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50",
                    option.id === value ? "bg-slate-50 font-medium text-slate-900" : "text-slate-700"
                  )}
                >
                  {option.label}
                  {option.sublabel && (
                    <span className="ml-1 text-xs text-slate-400">{option.sublabel}</span>
                  )}
                </button>
              </li>
            ))}
            {allowCreate && query.trim() && !exactMatch && (
              <li>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full px-3 py-1.5 text-left text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50"
                >
                  {creating ? "Adding…" : `+ Add "${query.trim()}"`}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
