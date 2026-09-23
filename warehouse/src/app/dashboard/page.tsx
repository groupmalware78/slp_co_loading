import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeletePackages, canEditPackages, canLogPackages } from "@/lib/rbac";
import { DEFAULT_PACKAGES_PAGE_SIZE, packageInclude } from "@/lib/packageSchema";
import { PackagesView } from "@/components/PackagesView";
import type { PackageWithRelations } from "@/types/package";

export default async function DashboardPage() {
  const session = await auth();

  const [packages, total, companies, users] = await Promise.all([
    prisma.package.findMany({
      orderBy: { receivedAt: "desc" },
      take: DEFAULT_PACKAGES_PAGE_SIZE,
      include: packageInclude,
    }),
    prisma.package.count(),
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <PackagesView
      initialPackages={JSON.parse(JSON.stringify(packages)) as PackageWithRelations[]}
      initialPagination={{
        page: 1,
        pageSize: DEFAULT_PACKAGES_PAGE_SIZE,
        total,
        totalPages: Math.max(Math.ceil(total / DEFAULT_PACKAGES_PAGE_SIZE), 1),
      }}
      companies={companies}
      users={users}
      currentUser={{ id: session!.user.id, name: session!.user.name ?? "" }}
      canLog={canLogPackages(session!.user.role)}
      canDelete={canDeletePackages(session!.user.role)}
      canEdit={canEditPackages(session!.user.role)}
    />
  );
}
