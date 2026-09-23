"use client";

import { useCallback, useState } from "react";
import { LogPackageModal } from "./LogPackageModal";
import { LocatePackageModal } from "./LocatePackageModal";
import { PackageEditModal } from "./PackageEditModal";
import { PackageList } from "./PackageList";
import { PackageFilters, EMPTY_PACKAGE_FILTERS, type PackageFilterValues } from "./PackageFilters";
import { Pager } from "./Pager";
import type { PackageWithRelations } from "@/types/package";
import type { SortablePackageField } from "@/lib/packageSchema";

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface QueryState {
  page: number;
  search: string;
  filters: PackageFilterValues;
  sortBy: SortablePackageField;
  sortDir: "asc" | "desc";
}

export function PackagesView({
  initialPackages,
  initialPagination,
  companies,
  users,
  currentUser,
  canLog,
  canDelete,
  canEdit,
}: {
  initialPackages: PackageWithRelations[];
  initialPagination: Pagination;
  companies: { id: string; name: string }[];
  users: { id: string; name: string }[];
  currentUser: { id: string; name: string };
  canLog: boolean;
  canDelete: boolean;
  canEdit: boolean;
}) {
  const [packages, setPackages] = useState(initialPackages);
  const [pagination, setPagination] = useState(initialPagination);
  const [modalOpen, setModalOpen] = useState(false);
  const [locateModalOpen, setLocateModalOpen] = useState(false);
  const [handOffTrackingNumber, setHandOffTrackingNumber] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<PackageFilterValues>(EMPTY_PACKAGE_FILTERS);
  const [sortBy, setSortBy] = useState<SortablePackageField>("receivedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [refreshing, setRefreshing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageWithRelations | null>(null);

  const runQuery = useCallback(async (query: QueryState) => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(query.page));
      params.set("pageSize", String(initialPagination.pageSize));
      params.set("sortBy", query.sortBy);
      params.set("sortDir", query.sortDir);
      if (query.search) params.set("search", query.search);
      if (query.filters.companyId) params.set("companyId", query.filters.companyId);
      if (query.filters.receivedById) params.set("receivedById", query.filters.receivedById);
      if (query.filters.status) params.set("status", query.filters.status);
      if (query.filters.dateFrom) params.set("dateFrom", query.filters.dateFrom);
      if (query.filters.dateTo) params.set("dateTo", query.filters.dateTo);
      const res = await fetch(`/api/packages?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setPackages(data.packages as PackageWithRelations[]);
      setPagination(data.pagination as Pagination);
    } finally {
      setRefreshing(false);
    }
  }, [initialPagination.pageSize]);

  function handlePackageLogged(pkg: PackageWithRelations) {
    setPackages((prev) => [pkg, ...prev]);
  }

  function handleModalClose() {
    setModalOpen(false);
    setHandOffTrackingNumber(null);
    // Re-sync with the server once the attendant is done scanning.
    runQuery({ page: pagination.page, search, filters, sortBy, sortDir });
  }

  function handlePackageFound(pkg: PackageWithRelations) {
    setLocateModalOpen(false);
    setSelectedPackage(pkg);
  }

  function handleLogNewFromLocate(trackingNumber: string) {
    setLocateModalOpen(false);
    setHandOffTrackingNumber(trackingNumber);
    setModalOpen(true);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    runQuery({ page: 1, search, filters, sortBy, sortDir });
  }

  function handleFiltersChange(next: PackageFilterValues) {
    setFilters(next);
    runQuery({ page: 1, search, filters: next, sortBy, sortDir });
  }

  function handleSort(field: SortablePackageField) {
    const nextDir: "asc" | "desc" = field === sortBy && sortDir === "asc" ? "desc" : "asc";
    setSortBy(field);
    setSortDir(nextDir);
    runQuery({ page: 1, search, filters, sortBy: field, sortDir: nextDir });
  }

  function handlePageChange(page: number) {
    runQuery({ page, search, filters, sortBy, sortDir });
  }

  async function handleDelete(id: string) {
    setDeleteError(null);
    const res = await fetch(`/api/packages/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setDeleteError(data?.error ?? "Failed to delete package.");
      return;
    }
    // Deleting can empty out the current page (e.g. the last item on the
    // last page), so re-fetch instead of just filtering local state.
    const isLastItemOnPage = packages.length === 1 && pagination.page > 1;
    await runQuery({
      page: isLastItemOnPage ? pagination.page - 1 : pagination.page,
      search,
      filters,
      sortBy,
      sortDir,
    });
  }

  function handlePackageUpdated(updated: PackageWithRelations) {
    setPackages((prev) => prev.map((pkg) => (pkg.id === updated.id ? updated : pkg)));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Packages</h1>
          <p className="text-sm text-slate-500">
            Packages received at the warehouse.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSubmit}>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracking number…"
              className="w-56 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </form>
          {canEdit && (
            <button
              type="button"
              onClick={() => setLocateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              Scan to edit
            </button>
          )}
          {canLog && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Log package
            </button>
          )}
        </div>
      </div>

      <PackageFilters
        filters={filters}
        companies={companies}
        users={users}
        onChange={handleFiltersChange}
      />

      {deleteError && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {deleteError}
        </div>
      )}

      <PackageList
        packages={packages}
        canDelete={canDelete}
        onDelete={handleDelete}
        onSelect={setSelectedPackage}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        footer={
          <Pager
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onPageChange={handlePageChange}
            disabled={refreshing}
          />
        }
      />

      {modalOpen && (
        <LogPackageModal
          currentUserName={currentUser.name}
          initialTrackingNumber={handOffTrackingNumber ?? undefined}
          onClose={handleModalClose}
          onPackageLogged={handlePackageLogged}
        />
      )}

      {locateModalOpen && (
        <LocatePackageModal
          canLog={canLog}
          onClose={() => setLocateModalOpen(false)}
          onFound={handlePackageFound}
          onLogNew={handleLogNewFromLocate}
        />
      )}

      {selectedPackage && (
        <PackageEditModal
          pkg={selectedPackage}
          canEdit={canEdit}
          onClose={() => setSelectedPackage(null)}
          onUpdated={handlePackageUpdated}
        />
      )}
    </div>
  );
}
