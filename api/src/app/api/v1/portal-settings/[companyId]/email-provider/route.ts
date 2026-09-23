import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";
import { encryptSecret } from "@/lib/settingsEncryption";

// Deliberately separate from the generic PATCH /v1/portal-settings/[companyId]
// route: that route does a blind upsert(parsed.data) with no per-field
// handling, which is wrong for a secret (it would store it in plaintext
// and echo it back unfiltered on the next GET). This route is the only
// place a tenant's Resend API key / SMTP password is ever encrypted, and
// the only GET that legitimately touches this settings group never
// returns the secret itself — only whether one is configured.

const SELECT = {
  emailProvider: true,
  emailFromAddress: true,
  smtpHost: true,
  smtpPort: true,
  smtpUsername: true,
  smtpSecure: true,
  resendApiKeyEncrypted: true,
  smtpPasswordEncrypted: true,
} as const;

function toResponseShape(settings: {
  emailProvider: string | null;
  emailFromAddress: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  smtpSecure: boolean;
  resendApiKeyEncrypted: string | null;
  smtpPasswordEncrypted: string | null;
}) {
  const hasSecretConfigured =
    settings.emailProvider === "RESEND"
      ? !!settings.resendApiKeyEncrypted
      : settings.emailProvider === "SMTP"
        ? !!settings.smtpPasswordEncrypted
        : false;

  return {
    emailProvider: settings.emailProvider,
    emailFromAddress: settings.emailFromAddress,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUsername: settings.smtpUsername,
    smtpSecure: settings.smtpSecure,
    hasSecretConfigured,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const { companyId: requestedId } = await params;
  if (requestedId !== companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await prisma.portalSettings.findUnique({ where: { id: companyId }, select: SELECT });
  if (!settings) {
    return NextResponse.json(toResponseShape({
      emailProvider: null,
      emailFromAddress: null,
      smtpHost: null,
      smtpPort: null,
      smtpUsername: null,
      smtpSecure: true,
      resendApiKeyEncrypted: null,
      smtpPasswordEncrypted: null,
    }));
  }
  return NextResponse.json(toResponseShape(settings));
}

const patchSchema = z.object({
  // PLATFORM_DEFAULT clears the tenant's own provider (falls back to the
  // shared platform key, today's behavior).
  emailProvider: z.enum(["RESEND", "SMTP", "PLATFORM_DEFAULT"]),
  emailFromAddress: z.string().trim().email().optional().nullable(),
  // Omit to keep the existing stored secret; send an empty string is
  // treated the same as omitting (never stores an empty secret).
  resendApiKey: z.string().trim().optional(),
  smtpHost: z.string().trim().max(255).optional().nullable(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional().nullable(),
  smtpUsername: z.string().trim().max(255).optional().nullable(),
  smtpSecure: z.boolean().optional(),
  smtpPassword: z.string().trim().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const { companyId: requestedId } = await params;
  if (requestedId !== companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
  if (!company) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const update: Record<string, unknown> = {
    emailProvider: data.emailProvider === "PLATFORM_DEFAULT" ? null : data.emailProvider,
    emailFromAddress: data.emailFromAddress ?? null,
    smtpHost: data.smtpHost ?? null,
    smtpPort: data.smtpPort ?? null,
    smtpUsername: data.smtpUsername ?? null,
    ...(data.smtpSecure !== undefined ? { smtpSecure: data.smtpSecure } : {}),
  };
  if (data.resendApiKey) update.resendApiKeyEncrypted = encryptSecret(data.resendApiKey);
  if (data.smtpPassword) update.smtpPasswordEncrypted = encryptSecret(data.smtpPassword);

  const settings = await prisma.portalSettings.upsert({
    where: { id: companyId },
    create: { id: companyId, companyName: company.name, ...update },
    update,
    select: SELECT,
  });

  return NextResponse.json(toResponseShape(settings));
}
