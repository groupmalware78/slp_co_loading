import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { homeRouteForRole } from "@/lib/rbac";

// No page of its own — just routes each role to its actual home section
// (ADMIN -> Companies, every other role -> Packages, the only section
// they can reach).
export default async function DashboardIndexPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect(homeRouteForRole(session.user.role));
}
