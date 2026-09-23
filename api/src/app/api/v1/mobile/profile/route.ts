import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileSession, mobileUnauthorizedResponse } from "@/lib/mobileAuth";
import { PHONE_FORMAT_REGEX } from "@/lib/phoneFormat";

// Mirrors the staff/web PATCH portal-users behavior — name-only (staff)
// and the CUSTOMER personal-info/address fields share one schema/endpoint.
const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  firstName: z.string().trim().min(1, "First name is required").max(75).optional(),
  lastName: z.string().trim().min(1, "Last name is required").max(75).optional(),
  phone: z
    .string()
    .trim()
    .min(1, "Phone is required")
    .max(30)
    .refine((v) => PHONE_FORMAT_REGEX.test(v), {
      message: "Enter a phone number in the format +1 (000) 000-0000",
    })
    .optional(),
  storeLocation: z.string().trim().max(150).optional().nullable(),
  addressLine1: z.string().trim().min(1, "Address line 1 is required").max(150).optional(),
  addressLine2: z.string().trim().max(150).optional().nullable(),
  cityParish: z.string().trim().min(1, "City / parish is required").max(100).optional(),
  country: z.string().trim().min(1, "Country is required").max(100).optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await getMobileSession(request);
  if (!session) return mobileUnauthorizedResponse();

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { firstName, lastName, phone, storeLocation, addressLine1, addressLine2, cityParish, country, name } =
    parsed.data;

  const editingCustomerFields =
    firstName !== undefined ||
    lastName !== undefined ||
    phone !== undefined ||
    storeLocation !== undefined ||
    addressLine1 !== undefined ||
    addressLine2 !== undefined ||
    cityParish !== undefined ||
    country !== undefined;

  const existing = await prisma.portalUser.findUnique({ where: { id: session.userId } });
  if (!existing) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  if (editingCustomerFields && session.role === "CUSTOMER" && !existing.emailVerified) {
    return NextResponse.json(
      { error: "Please verify your email address before updating your account." },
      { status: 403 }
    );
  }

  const data: Record<string, string | null> = {};
  if (name !== undefined) data.name = name;
  if (firstName !== undefined) data.firstName = firstName;
  if (lastName !== undefined) data.lastName = lastName;
  if (firstName !== undefined || lastName !== undefined) {
    data.name = `${firstName ?? existing.firstName ?? ""} ${lastName ?? existing.lastName ?? ""}`.trim();
  }
  if (phone !== undefined) data.phone = phone;
  if (storeLocation !== undefined) data.storeLocation = storeLocation || null;
  if (addressLine1 !== undefined) data.addressLine1 = addressLine1;
  if (addressLine2 !== undefined) data.addressLine2 = addressLine2 || null;
  if (cityParish !== undefined) data.cityParish = cityParish;
  if (country !== undefined) data.country = country;

  const user = await prisma.portalUser.update({ where: { id: session.userId }, data });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      storeLocation: user.storeLocation,
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      cityParish: user.cityParish,
      country: user.country,
      trn: user.trn,
      emailVerified: user.emailVerified,
    },
  });
}
