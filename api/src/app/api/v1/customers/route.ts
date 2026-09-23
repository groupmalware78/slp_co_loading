import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";
import { generateCustomerCode } from "@/lib/customerCode";

const PAGE_SIZE = 25;

// List/search — backs customer-portal's staff-facing /customers directory.
export async function GET(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const page = Math.max(Number(params.get("page")) || 1, 1);
  // Callers like the /packages edit modal's customer picker want every
  // customer unpaginated (for a searchable dropdown, not a paged list) —
  // pageSize defaults to 25 but can be raised, capped well above any
  // realistic single-tenant customer count.
  const pageSize = Math.min(Number(params.get("pageSize")) || PAGE_SIZE, 5000);

  const where = {
    companyId,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { customerCode: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      // Powers customer-portal's /customers directory "Packages" column —
      // harmless extra data for callers (like the customer picker) that
      // don't use it.
      include: { _count: { select: { packages: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({
    customers,
    total,
    page,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  });
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional(),
  trn: z.string().trim().max(30).optional(),
  // Only customer-portal's own /signup sets this — the "suite number"
  // style code is a self-registration artifact, not something admin
  // staff-created customers get (matches admin's own existing
  // api/customers behavior, which never sets one).
  assignCustomerCode: z.boolean().optional(),
});

// Used by signup and the pre-alert flow's "create the customer record if
// none exists yet" write-exception (see the comment on customer-portal's
// own Package model). Returns the existing row (200) if one already
// matches companyId+email rather than erroring, since both callers treat
// "already exists" as success, not a conflict.
export async function POST(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { name, email, phone, trn, assignCustomerCode } = parsed.data;

  const existing = await prisma.customer.findFirst({ where: { companyId, email } });
  if (existing) {
    return NextResponse.json({ customer: existing });
  }

  const customerCode = assignCustomerCode ? await generateCustomerCode(companyId) : null;

  const customer = await prisma.customer.create({
    data: { companyId, name, email, phone: phone || null, trn: trn || null, customerCode },
  });
  return NextResponse.json({ customer }, { status: 201 });
}
