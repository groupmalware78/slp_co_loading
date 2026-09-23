import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PackageLabel } from "@/components/PackageLabel";

// Outside /dashboard on purpose — this is a standalone print view (no
// sidebar/nav chrome), same reasoning as /login living outside it.
export default async function PackageLabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const pkg = await prisma.package.findUnique({
    where: { id },
    select: {
      trackingNumber: true,
      description: true,
      weightLbs: true,
      company: { select: { name: true } },
      customer: { select: { name: true, customerCode: true } },
    },
  });
  if (!pkg) notFound();

  return (
    <PackageLabel
      trackingNumber={pkg.trackingNumber}
      customerCode={pkg.customer?.customerCode ?? null}
      customerName={pkg.customer?.name ?? null}
      description={pkg.description}
      companyName={pkg.company?.name ?? null}
      weightLbs={pkg.weightLbs}
    />
  );
}
