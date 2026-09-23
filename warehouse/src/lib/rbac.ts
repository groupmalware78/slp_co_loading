import { Role } from "@prisma/client";

// Warehouse only ever sees ADMIN and WAREHOUSE_ATTENDANT accounts — CSR
// was dropped system-wide, and CUSTOMER/DRIVER accounts (PortalUser, a
// different table) never log into this app.
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  WAREHOUSE_ATTENDANT: "Warehouse Attendant",
};

// Roles allowed to log (add) packages received at the warehouse. Warehouse
// attendants may only add, not delete.
export const CAN_LOG_PACKAGES: Role[] = ["ADMIN", "WAREHOUSE_ATTENDANT"];

// Roles allowed to delete package records.
export const CAN_DELETE_PACKAGES: Role[] = ["ADMIN"];

// Roles allowed to edit an already-logged package's details.
export const CAN_EDIT_PACKAGES: Role[] = ["ADMIN", "WAREHOUSE_ATTENDANT"];

export function canLogPackages(role: Role | undefined | null): boolean {
  return !!role && CAN_LOG_PACKAGES.includes(role);
}

export function canDeletePackages(role: Role | undefined | null): boolean {
  return !!role && CAN_DELETE_PACKAGES.includes(role);
}

export function canEditPackages(role: Role | undefined | null): boolean {
  return !!role && CAN_EDIT_PACKAGES.includes(role);
}

// Roles allowed to read the customers directory used to populate the
// package log/edit form's customer picker, and to quick-add a customer
// while logging a package.
export function canViewDirectories(role: Role | undefined | null): boolean {
  return canLogPackages(role) || canEditPackages(role);
}
