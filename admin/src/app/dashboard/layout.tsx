import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  // ADMIN-only now — WAREHOUSE_ATTENDANT accounts exist in the shared
  // users table but have nothing to do in this app; they log into
  // Warehouse instead.
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar user={session.user} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
