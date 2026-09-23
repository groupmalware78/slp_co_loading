import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageRates } from "@/lib/rbac";
import { RatesView } from "@/components/RatesView";

export default async function RatesPage() {
  const session = await auth();
  if (!session?.user || !canManageRates(session.user.role)) {
    redirect("/dashboard");
  }

  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, perPackageRate: true },
  });

  return <RatesView initialCompanies={companies} />;
}
