import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { generateOtp } from "./otp";
import { sendCompanyRegistrationEmail } from "./email";
import { generateApiKey, hashApiKey, apiKeyPreview } from "./apiKeyHash";
import { recordAudit } from "./audit";

// Matches api/'s own portal-users/signup EMAIL_VERIFICATION_TTL_MS —
// no shared package exists in this repo, so kept in sync by hand.
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export class CompanyRegistrationError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface RegisterCompanyInput {
  code: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  trn?: string;
}

// The whole company-registration transaction, shared by the staff-facing
// "Add company" form (POST /api/companies, performedById = the signed-in
// staff member) and the public self-service /signup page (POST
// /api/signup, performedById = null — no staff session exists). Creates
// the Company, provisions its initial customer-portal ADMIN PortalUser
// with an OTP password (forced change on first login), and emails both
// that OTP/API key AND an email-verification link — see
// /verify-email/page.tsx for the consuming side. Points the verification
// link at THIS admin app's own domain rather than the new company's
// customer-portal deployment, since that deployment doesn't exist yet at
// registration time (it's a separate, later ops step).
export async function registerCompany(
  input: RegisterCompanyInput,
  performedById: string | null
) {
  const { code, name, contactName, contactEmail, contactPhone, address, trn } = input;

  const [nameConflict, emailConflict, codeConflict] = await Promise.all([
    prisma.company.findUnique({ where: { name } }),
    prisma.company.findUnique({ where: { contactEmail } }),
    prisma.company.findUnique({ where: { code } }),
  ]);
  if (nameConflict) throw new CompanyRegistrationError("A company with that name already exists.", 409);
  if (emailConflict) throw new CompanyRegistrationError("A company with that email already exists.", 409);
  if (codeConflict) throw new CompanyRegistrationError("A company with that code already exists.", 409);

  const apiKey = generateApiKey();

  let company;
  try {
    company = await prisma.company.create({
      data: {
        name,
        code,
        apiKeyHash: hashApiKey(apiKey),
        apiKeyPrefix: apiKeyPreview(apiKey),
        apiKeyRotatedAt: new Date(),
        contactName,
        contactEmail,
        contactPhone,
        address,
        trn: trn || undefined,
      },
      // Explicit select — apiKeyHash must never reach the client.
      select: {
        id: true,
        name: true,
        code: true,
        apiKeyPrefix: true,
        apiKeyScope: true,
        apiKeyRotatedAt: true,
        requestsPerMinute: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        address: true,
        trn: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    // Two requests racing with the same code/name/email can both pass the
    // findUnique checks above before either write lands — the database's
    // own @unique constraint is the actual source of truth.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : String(err.meta?.target ?? "");
      const field = target.includes("code")
        ? "code"
        : target.includes("contactEmail")
          ? "email"
          : target.includes("name")
            ? "name"
            : "details";
      throw new CompanyRegistrationError(`A company with that ${field} already exists.`, 409);
    }
    throw err;
  }

  await recordAudit({
    entityType: "COMPANY",
    entityId: company.id,
    action: "CREATE",
    performedById,
    after: company,
  });

  const otp = generateOtp();
  const passwordHash = await bcrypt.hash(otp, 10);
  const verificationToken = randomBytes(32).toString("hex");
  const verificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  // Upsert rather than create — re-registering with an email that already
  // has a portal account (e.g. retrying after an email-send failure)
  // issues a fresh OTP and verification token instead of erroring.
  await prisma.portalUser.upsert({
    where: { companyId_email: { companyId: company.id, email: contactEmail } },
    update: {
      passwordHash,
      role: "ADMIN",
      mustChangePassword: true,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    },
    create: {
      companyId: company.id,
      name: contactName,
      email: contactEmail,
      passwordHash,
      role: "ADMIN",
      mustChangePassword: true,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

  const { sent: emailSent } = await sendCompanyRegistrationEmail({
    to: contactEmail,
    contactName,
    companyName: name,
    companyCode: code,
    apiKey,
    otp,
    verificationUrl,
  });

  return { company, apiKey, otp, emailSent };
}
