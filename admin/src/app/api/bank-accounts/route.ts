import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBanking } from "@/lib/rbac";

// The platform's own bank accounts — multiple allowed (e.g. one per
// currency). Every ACTIVE account is printed on the manifest billing
// invoice (see lib/manifestInvoicePdf.ts and the generate-invoice route).
// No audit log entry, same reasoning as platform-settings: operator-only,
// doesn't fit AuditEntity's PACKAGE/COMPANY/CUSTOMER/USER/MANIFEST set.
export async function GET() {
  const session = await auth();
  if (!session?.user || !canManageBanking(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bankAccounts = await prisma.platformBankAccount.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ bankAccounts });
}

const createSchema = z.object({
  label: z.string().trim().max(100).optional().nullable(),
  bankName: z.string().trim().min(1, "Bank name is required").max(150),
  accountName: z.string().trim().min(1, "Account name is required").max(150),
  accountNumber: z.string().trim().min(1, "Account number is required").max(50),
  routingNumber: z.string().trim().max(50).optional().nullable(),
  branch: z.string().trim().max(150).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManageBanking(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const bankAccount = await prisma.platformBankAccount.create({ data: parsed.data });
  return NextResponse.json({ bankAccount }, { status: 201 });
}
