import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/rbac";
import { UsersView } from "@/components/UsersView";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return (
    <UsersView
      initialUsers={JSON.parse(JSON.stringify(users))}
      currentUserId={session.user.id}
    />
  );
}
