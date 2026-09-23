import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCompanies } from "@/lib/rbac";
import { companySchema } from "@/lib/companySchema";
import { recordAudit } from "@/lib/audit";
import { generateOtp } from "@/lib/otp";
import { sendCompanyRegistrationEmail } from "@/lib/email";
import { generateApiKey, hashApiKey, apiKeyPreview } from "@/lib/apiKeyHash";

// Exactly 3 letters, no digits/separator: word initials when the name has
// enough words (e.g. "Sky Box Courier" -> "SBC"), otherwise the leading
// letters of the name itself (e.g. "Acme" -> "ACM"), padded with "X" if
// the name is too short to supply three.
function generateCompanyCode(name: string): string {
  const words = name
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const base =
    words.length >= 3
      ? words.map((word) => word[0]).join("")
      : words.join("");

  return (base.toUpperCase().slice(0, 3) || "").padEnd(3, "X");
}

function randomCompanyCode(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
}

async function generateUniqueCompanyCode(name: string): Promise<string> {
  const preferred = generateCompanyCode(name);
  if (!(await prisma.company.findUnique({ where: { code: preferred } }))) {
    return preferred;
  }

  // The name-derived code is taken — fall back to a random 3-letter code
  // (17,576 possibilities) instead of appending digits, since the code
  // must stay exactly 3 letters.
  for (let attempt = 0; attempt < 50; attempt++) {
    const code = randomCompanyCode();
    if (!(await prisma.company.findUnique({ where: { code } }))) {
      return code;
    }
  }
  throw new Error("Could not generate a unique 3-letter company code.");
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

  const { name, contactName, contactEmail, contactPhone, address } = parsed.data;

  const [nameConflict, emailConflict] = await Promise.all([
    prisma.company.findUnique({ where: { name } }),
    prisma.company.findUnique({ where: { contactEmail } }),
  ]);
  if (nameConflict) {
    return NextResponse.json(
      { error: "A company with that name already exists." },
      { status: 409 }
    );
  }
  if (emailConflict) {
    return NextResponse.json(
      { error: "A company with that email already exists." },
      { status: 409 }
    );
  }

  const code = await generateUniqueCompanyCode(name);
  const apiKey = generateApiKey();

  const company = await prisma.company.create({
    data: {
      name,
      code,
      apiKeyHash: hashApiKey(apiKey),
      apiKeyPrefix: apiKeyPreview(apiKey),
      apiKeyRotatedAt: new Date(),
      contactName,
      contactEmail,
      contactPhone,
      address: address || undefined,
    },
    // Explicit select — apiKeyHash must never reach the client (see the
    // identical select on the companies dashboard page's fetch).
    select: {
      id: true,
      name: true,
      code: true,
      apiKeyPrefix: true,
      apiKeyScope: true,
      apiKeyRotatedAt: true,
      apiKeyRotationDays: true,
      apiKeyWebhookUrl: true,
      requestsPerMinute: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      address: true,
      active: true,
      perPackageRate: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await recordAudit({
    entityType: "COMPANY",
    entityId: company.id,
    action: "CREATE",
    performedById: session.user.id,
    after: company,
  });

  // Provision this company's initial customer-portal admin: an OTP as
  // their password, forced to change it on first login. Upsert rather
  // than create — re-registering with an email that already has a portal
  // account (e.g. retrying after an email-send failure) just issues a
  // fresh OTP instead of erroring.
  const otp = generateOtp();
  const passwordHash = await bcrypt.hash(otp, 10);

  await prisma.portalUser.upsert({
    where: { companyId_email: { companyId: company.id, email: contactEmail } },
    update: { passwordHash, role: "ADMIN", mustChangePassword: true },
    create: {
      companyId: company.id,
      name: contactName,
      email: contactEmail,
      passwordHash,
      role: "ADMIN",
      mustChangePassword: true,
    },
  });

  const { sent } = await sendCompanyRegistrationEmail({
    to: contactEmail,
    contactName,
    companyName: name,
    companyCode: code,
    apiKey,
    otp,
  });

  return NextResponse.json(
    // apiKey (raw) is returned once here for CompaniesView's one-time
    // reveal banner — it's never stored or retrievable again after this
    // response, only apiKeyHash/apiKeyPrefix are persisted.
    { company, apiKey, emailSent: sent, ...(sent ? {} : { otp }) },
    { status: 201 }
  );
}
