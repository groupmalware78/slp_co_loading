import type { PackageStatus, PaymentStatus } from "@prisma/client";
import clsx from "clsx";

const STATUS_STYLES: Record<PackageStatus, string> = {
  PENDING: "bg-slate-100 text-slate-600 ring-slate-500/20",
  RECEIVED: "bg-blue-50 text-blue-700 ring-blue-600/20",
  SHIPPED: "bg-teal-50 text-teal-700 ring-teal-600/20",
  AT_CUSTOMS: "bg-orange-50 text-orange-700 ring-orange-600/20",
  READY_FOR_PICKUP: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  OUT_FOR_DELIVERY: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  DELIVERED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  DAMAGED: "bg-red-50 text-red-700 ring-red-600/20",
  EMPTY_PACKAGE: "bg-amber-50 text-amber-700 ring-amber-600/20",
  RETURNED: "bg-purple-50 text-purple-700 ring-purple-600/20",
};

export const PACKAGE_STATUSES: PackageStatus[] = [
  "PENDING",
  "RECEIVED",
  "SHIPPED",
  "AT_CUSTOMS",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DAMAGED",
  "EMPTY_PACKAGE",
  "RETURNED",
];

export const STATUS_LABELS: Record<PackageStatus, string> = {
  PENDING: "Pending (pre-alert)",
  RECEIVED: "Received",
  SHIPPED: "Shipped",
  AT_CUSTOMS: "At customs",
  READY_FOR_PICKUP: "Ready for pickup",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  DAMAGED: "Damaged",
  EMPTY_PACKAGE: "Empty package",
  RETURNED: "Returned",
};

export function PackageStatusBadge({ status }: { status: PackageStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        STATUS_STYLES[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  UNPAID: "bg-red-50 text-red-700 ring-red-600/20",
  PARTIAL: "bg-amber-50 text-amber-700 ring-amber-600/20",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export const PAYMENT_STATUSES: PaymentStatus[] = ["UNPAID", "PARTIAL", "PAID"];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partially paid",
  PAID: "Paid",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        PAYMENT_STATUS_STYLES[status]
      )}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
