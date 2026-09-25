import type { PackageStatus, PaymentStatus } from "@prisma/client";
import clsx from "clsx";

const STATUS_STYLES: Record<PackageStatus, string> = {
  PENDING: "bg-slate-500 text-white shadow-sm shadow-slate-500/30",
  RECEIVED: "bg-blue-500 text-white shadow-sm shadow-blue-500/30",
  SHIPPED: "bg-teal-500 text-white shadow-sm shadow-teal-500/30",
  AT_CUSTOMS: "bg-orange-500 text-white shadow-sm shadow-orange-500/30",
  READY_FOR_PICKUP: "bg-indigo-500 text-white shadow-sm shadow-indigo-500/30",
  OUT_FOR_DELIVERY: "bg-cyan-500 text-white shadow-sm shadow-cyan-500/30",
  DELIVERED: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30",
  DAMAGED: "bg-red-500 text-white shadow-sm shadow-red-500/30",
  EMPTY_PACKAGE: "bg-amber-500 text-white shadow-sm shadow-amber-500/30",
  RETURNED: "bg-purple-500 text-white shadow-sm shadow-purple-500/30",
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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        STATUS_STYLES[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  UNPAID: "bg-red-500 text-white shadow-sm shadow-red-500/30",
  PARTIAL: "bg-amber-500 text-white shadow-sm shadow-amber-500/30",
  PAID: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30",
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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        PAYMENT_STATUS_STYLES[status]
      )}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
