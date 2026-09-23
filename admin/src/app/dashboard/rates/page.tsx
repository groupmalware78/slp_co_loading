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

  const settings = await prisma.platformSettings.findUnique({
    where: { id: "platform" },
    select: { perPackageRate: true },
  });

  return <RatesView initialRate={settings?.perPackageRate ?? 0} />;
}
