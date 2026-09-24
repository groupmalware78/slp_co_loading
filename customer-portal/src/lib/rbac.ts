import type { PortalRole } from "@/lib/apiTypes";

export const ROLE_LABELS: Record<PortalRole, string> = {
  ADMIN: "Administrator",
  CSR: "Customer Service Rep",
  CUSTOMER: "Customer",
  DRIVER: "Driver",
  LOGGER: "Logger",
};

export const ROLES: PortalRole[] = ["ADMIN", "CSR", "CUSTOMER", "DRIVER", "LOGGER"];

// Roles allowed to customize this instance's CMS branding and manage staff
// accounts (CSR/Driver). Customer accounts are self-registered, not
// admin-created, so they're not managed here.
export const CAN_MANAGE_PORTAL: PortalRole[] = ["ADMIN"];

// Roles allowed to see and act on delivery assignments — progressing a
// delivery's status (out for delivery / delivered / failed) and, for
// ADMIN, viewing every delivery for the tenant. Assigning a driver to a
// REQUESTED delivery is a separate permission (see canAssignDeliveries
// below) so CSR can do that without gaining driver-only status actions.
export const CAN_MANAGE_DELIVERIES: PortalRole[] = ["ADMIN", "DRIVER"];

// Roles allowed to assign a customer-requested delivery to a driver (the
// /driver page's "all deliveries" view, reached by both this and
// canManageDeliveries).
export const CAN_ASSIGN_DELIVERIES: PortalRole[] = ["ADMIN", "CSR"];

// Roles allowed to browse the packages list. Admin/CSR/Logger see every
// package for this tenant; Drivers see only packages assigned to them
// (enforced by the query, not this check) — Customers already have "My
// Shipments".
export const CAN_VIEW_PACKAGES: PortalRole[] = ["ADMIN", "CSR", "DRIVER", "LOGGER"];

export function canManagePortal(role: PortalRole | undefined | null): boolean {
  return !!role && CAN_MANAGE_PORTAL.includes(role);
}

export function canManageDeliveries(role: PortalRole | undefined | null): boolean {
  return !!role && CAN_MANAGE_DELIVERIES.includes(role);
}

export function canAssignDeliveries(role: PortalRole | undefined | null): boolean {
  return !!role && CAN_ASSIGN_DELIVERIES.includes(role);
}

// Roles allowed to see the /driver page at all — the union of the two
// permissions above (progress-status vs. assign-driver), since ADMIN and
// DRIVER need it for one reason and CSR for the other.
export function canViewDeliveriesPage(role: PortalRole | undefined | null): boolean {
  return canManageDeliveries(role) || canAssignDeliveries(role);
}

export function canViewPackages(role: PortalRole | undefined | null): boolean {
  return !!role && CAN_VIEW_PACKAGES.includes(role);
}

// Roles allowed to browse this tenant's customer directory (/customers).
export const CAN_VIEW_CUSTOMERS: PortalRole[] = ["ADMIN", "CSR"];

export function canViewCustomers(role: PortalRole | undefined | null): boolean {
  return !!role && CAN_VIEW_CUSTOMERS.includes(role);
}

// Roles allowed to view financial/customers/packages reports for this tenant.
export const CAN_VIEW_REPORTS: PortalRole[] = ["ADMIN"];

export function canViewReports(role: PortalRole | undefined | null): boolean {
  return !!role && CAN_VIEW_REPORTS.includes(role);
}

// Roles allowed to use the fee calculator (/fee-calculator) to generate a
// fee for a package from admin-configured fee tiers. Managing the tiers
// themselves (/admin/fees) stays ADMIN-only, via canManagePortal.
export const CAN_USE_FEE_CALCULATOR: PortalRole[] = ["ADMIN", "CSR"];

export function canUseFeeCalculator(role: PortalRole | undefined | null): boolean {
  return !!role && CAN_USE_FEE_CALCULATOR.includes(role);
}

export const EDITABLE_PACKAGE_FIELDS = [
  "status",
  "packageType",
  "weightLbs",
  "pieces",
  "description",
  "declaredValue",
  "customerId",
  "rate",
  "cost",
  "paymentStatus",
  "amountPaid",
] as const;
export type EditablePackageField = (typeof EDITABLE_PACKAGE_FIELDS)[number];

// Which package fields a role may change from /packages' edit modal.
// Admin: everything, including reassigning the customer. CSR: payment
// status only — a billing correction, not a package-details edit; they no
// longer touch status/weight/rate/cost/customer (moved to Logger below).
// Logger: package details (status/type/weight/pieces/description/
// declared value/customer) but no billing fields — a warehouse-adjacent
// editor, not support/billing staff. Driver: status only. Customer never
// reaches this — no edit access at all.
export function editablePackageFields(role: PortalRole | undefined | null): EditablePackageField[] {
  switch (role) {
    case "ADMIN":
      return [
        "status",
        "packageType",
        "weightLbs",
        "pieces",
        "description",
        "declaredValue",
        "customerId",
        "rate",
        "cost",
        "paymentStatus",
        "amountPaid",
      ];
    case "CSR":
      return ["paymentStatus"];
    case "LOGGER":
      return [
        "status",
        "packageType",
        "weightLbs",
        "pieces",
        "description",
        "declaredValue",
        "customerId",
      ];
    case "DRIVER":
      return ["status"];
    default:
      return [];
  }
}

// Roles allowed to reassign a package's customer — used to gate the
// customer-picker endpoint separately from the general edit permission
// check, since it also powers the /packages picker UI.
export function canEditPackageCustomer(role: PortalRole | undefined | null): boolean {
  return editablePackageFields(role).includes("customerId");
}

// Statuses a customer-requested delivery could sensibly repeat from — an
// existing REQUESTED/ASSIGNED/OUT_FOR_DELIVERY row blocks a new request
// (one at a time), but a FAILED one (or none at all) doesn't, and DELIVERED
// packages can't be requested regardless of any delivery row.
export const ACTIVE_DELIVERY_STATUSES = ["REQUESTED", "ASSIGNED", "OUT_FOR_DELIVERY"] as const;

export function homeRouteForRole(role: PortalRole): string {
  switch (role) {
    case "ADMIN":
    case "CSR":
    case "DRIVER":
    case "LOGGER":
      return "/packages";
    case "CUSTOMER":
    default:
      return "/my-shipments";
  }
}
