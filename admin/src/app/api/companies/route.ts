import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCompanies, canViewDirectories } from "@/lib/rbac";
import { companySchema } from "@/lib/companySchema";
import { registerCompany, CompanyRegistrationError } from "@/lib/companyRegistration";

// Read-only company directory for the package edit/log forms' company
// picker (PackageEditModal.tsx) — same gate as GET /api/customers. Never
// existed before the Warehouse app was merged in, since admin's own
// Companies page fetches directly via Prisma server-side rather than this
// route; PackageEditModal's picker has been silently 405-ing since the
// merge until this was added.
export async function GET() {
  const session = await auth();
  if (!session?.user || !canViewDirectories(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return NextResponse.json({ companies });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManageCompanies(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = companySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { code, name, contactName, contactEmail, contactPhone, address, trn } = parsed.data;
  if (!code) {
    return NextResponse.json({ error: "Company code is required." }, { status: 400 });
  }

  try {
    const { company, apiKey, otp, emailSent } = await registerCompany(
      { code, name, contactName, contactEmail, contactPhone, address, trn },
      session.user.id
    );

    return NextResponse.json(
      // apiKey (raw) is returned once here for CompaniesView's one-time
      // reveal banner — it's never stored or retrievable again after this
      // response, only apiKeyHash/apiKeyPrefix are persisted.
      { company, apiKey, emailSent, ...(emailSent ? {} : { otp }) },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof CompanyRegistrationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
