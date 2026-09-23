import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";
import { generateCustomerCode } from "@/lib/customerCode";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

// The whole customer self-registration transaction in one call — was
// several sequential Prisma calls in customer-portal's own
// api/signup/route.ts (find-or-create PortalUser, find-or-create Customer
// with a generated code, issue a verification token). Collapsed here
// rather than mirrored 1:1 as several SDK round-trips.
//
// Does NOT send the verification email itself — that stays in
// customer-portal (it owns the Resend template/branding and its own
// public URL for the verify-email link); this just returns the token so
// the caller can build the link and send it.
const signupSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(75),
  middleInitial: z.string().trim().min(1, "Middle initial is required").max(3),
  lastName: z.string().trim().min(1, "Last name is required").max(75),
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().trim().min(1, "Phone is required").max(30),
  workPhone: z.string().trim().max(30).optional(),
  addressLine1: z.string().trim().min(1, "Address line 1 is required").max(150),
  addressLine2: z.string().trim().max(150).optional(),
  cityParish: z.string().trim().min(1, "City / parish is required").max(100),
  country: z.string().trim().min(1, "Country is required").max(100),
  trn: z.string().trim().min(1, "TRN is required").max(20),
  storeLocation: z.string().trim().max(150).optional(),
});

export async function POST(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const {
    firstName,
    middleInitial,
    lastName,
    email,
    password,
    phone,
    workPhone,
    addressLine1,
    addressLine2,
    cityParish,
    country,
    trn,
    storeLocation,
  } = parsed.data;

  const existing = await prisma.portalUser.findUnique({ where: { companyId_email: { companyId, email } } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const existingCustomer = await prisma.customer.findFirst({ where: { email, companyId } });
  const trnConflict = await prisma.customer.findFirst({ where: { trn, companyId } });
  if (trnConflict && trnConflict.id !== existingCustomer?.id) {
    return NextResponse.json({ error: "That TRN is already registered to another customer." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  const portalUser = await prisma.portalUser.create({
    data: {
      companyId,
      name: `${firstName} ${middleInitial} ${lastName}`,
      firstName,
      middleInitial,
      lastName,
      email,
      passwordHash,
      role: "CUSTOMER",
      phone,
      workPhone: workPhone || null,
      addressLine1,
      addressLine2: addressLine2 || null,
      cityParish,
      country,
      trn: trn || null,
      storeLocation: storeLocation || null,
      termsAcceptedAt: new Date(),
      emailVerificationToken: token,
      emailVerificationExpires: expires,
    },
    omit: { passwordHash: true },
  });

  // Only create if no Customer row exists yet for this email in this
  // company — an admin may have already added one (e.g. while logging a
  // package before this person ever signed up), in which case it's
  // already correctly linked by email; just fill in the TRN if missing.
  let customerCode = existingCustomer?.customerCode ?? null;
  if (!existingCustomer) {
    customerCode = await generateCustomerCode(companyId);
    await prisma.customer.create({
      data: { name: `${firstName} ${middleInitial} ${lastName}`, email, phone, trn, companyId, customerCode },
    });
  } else if (!existingCustomer.trn) {
    await prisma.customer.update({ where: { id: existingCustomer.id }, data: { trn } });
  }

  return NextResponse.json({ user: portalUser, customerCode, emailVerificationToken: token }, { status: 201 });
}
