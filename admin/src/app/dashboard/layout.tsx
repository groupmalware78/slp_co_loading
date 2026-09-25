import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  // Any authenticated user (any role) may enter the
  // dashboard shell — which sections they can actually reach is enforced
  // per-page via lib/rbac.ts (see each page's own canXxx() redirect) and
  // reflected in Sidebar's own filtered nav links.
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-violet-50">
      <Sidebar user={session.user} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
