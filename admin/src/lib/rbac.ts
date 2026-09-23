import { Role } from "@prisma/client";

// This app (Service-Provider) is now effectively ADMIN-only — package
// logging (ADMIN + WAREHOUSE_ATTENDANT) moved to the Warehouse app. The
// Role enum keeps WAREHOUSE_ATTENDANT (the shared `users` table's own
// accounts, provisioned here, used to log into Warehouse) even though
// nothing in this app itself checks for it.
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  WAREHOUSE_ATTENDANT: "Warehouse Attendant",
};

export const ROLES: Role[] = ["ADMIN", "WAREHOUSE_ATTENDANT"];

// Roles allowed to manage users (invite/edit roles).
export const CAN_MANAGE_USERS: Role[] = ["ADMIN"];

// Roles allowed to manage freight forwarder companies.
export const CAN_MANAGE_COMPANIES: Role[] = ["ADMIN"];

// Roles allowed to view the audit log.
export const CAN_VIEW_AUDIT_LOG: Role[] = ["ADMIN"];

// Roles allowed to view financial/customers/packages reports.
export const CAN_VIEW_REPORTS: Role[] = ["ADMIN"];

// Roles allowed to view manifests across every company, and generate this
// platform's own billing invoice for one.
export const CAN_VIEW_MANIFESTS: Role[] = ["ADMIN"];

// Roles allowed to set each company's per-package billing rate.
export const CAN_MANAGE_RATES: Role[] = ["ADMIN"];

// Roles allowed to manage the platform's own banking info and invoice
// due-date terms (see /dashboard/banking).
export const CAN_MANAGE_BANKING: Role[] = ["ADMIN"];

export function canManageUsers(role: Role | undefined | null): boolean {
  return !!role && CAN_MANAGE_USERS.includes(role);
}

export function canManageCompanies(role: Role | undefined | null): boolean {
  return !!role && CAN_MANAGE_COMPANIES.includes(role);
}

export function canViewAuditLog(role: Role | undefined | null): boolean {
  return !!role && CAN_VIEW_AUDIT_LOG.includes(role);
}

export function canViewReports(role: Role | undefined | null): boolean {
  return !!role && CAN_VIEW_REPORTS.includes(role);
}

export function canViewManifests(role: Role | undefined | null): boolean {
  return !!role && CAN_VIEW_MANIFESTS.includes(role);
}

export function canManageRates(role: Role | undefined | null): boolean {
  return !!role && CAN_MANAGE_RATES.includes(role);
}

export function canManageBanking(role: Role | undefined | null): boolean {
  return !!role && CAN_MANAGE_BANKING.includes(role);
}
