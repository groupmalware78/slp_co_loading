import { redirect } from "next/navigation";

// Package logging/editing moved to the Warehouse app — this app's own
// /dashboard root has no page of its own anymore, just a sensible landing
// spot among what's left.
export default function DashboardIndexPage() {
  redirect("/dashboard/companies");
}
