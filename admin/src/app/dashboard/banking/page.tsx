import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBanking } from "@/lib/rbac";
import { BankingSettingsForm } from "@/components/BankingSettingsForm";

export default async function BankingPage() {
  const session = await auth();
  if (!session?.user || !canManageBanking(session.user.role)) {
    redirect("/dashboard");
  }

  const settings = await prisma.platformSettings.findUnique({ where: { id: "platform" } });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Banking</h1>
        <p className="text-sm text-slate-500">
          This platform&apos;s own payment info, printed on manifest billing invoices.
        </p>
      </div>
      <BankingSettingsForm initial={settings} />
    </div>
  );
}
