import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileSession, mobileUnauthorizedResponse } from "@/lib/mobileAuth";
import { PHONE_FORMAT_REGEX } from "@/lib/phoneFormat";

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .refine((v) => !v || PHONE_FORMAT_REGEX.test(v), {
      message: "Enter a phone number in the format +1 (000) 000-0000",
    }),
  relationship: z.string().trim().max(100).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getMobileSession(request);
  if (!session) return mobileUnauthorizedResponse();

  const people = await prisma.authorizedPickupPerson.findMany({
    where: { portalUserId: session.userId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ people });
}

export async function POST(request: NextRequest) {
  const session = await getMobileSession(request);
  if (!session) return mobileUnauthorizedResponse();

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const person = await prisma.authorizedPickupPerson.create({
    data: {
      portalUserId: session.userId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      relationship: parsed.data.relationship || null,
    },
  });

  return NextResponse.json({ person }, { status: 201 });
}
