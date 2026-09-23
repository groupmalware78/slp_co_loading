import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";
import { encryptSecret } from "@/lib/settingsEncryption";
import { sendViaConfig, type TenantEmailProviderConfig } from "@/lib/tenantEmailSender";

// Sends a test email using a CANDIDATE config (not necessarily the saved
// one) so an admin can verify a new SMTP password/Resend key works before
// committing it — never persists anything. Reuses PATCH's own schema
// shape rather than requiring the secret to already be saved: a fresh
// secret submitted here is encrypted only transiently (sendViaConfig
// needs the same "*Encrypted" shape tenantEmailSender.ts already knows
// how to decrypt) and is never written to the database.
const testSchema = z.object({
  to: z.string().trim().email(),
  emailProvider: z.enum(["RESEND", "SMTP"]),
  emailFromAddress: z.string().trim().email().optional().nullable(),
  resendApiKey: z.string().trim().optional(),
  smtpHost: z.string().trim().max(255).optional().nullable(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional().nullable(),
  smtpUsername: z.string().trim().max(255).optional().nullable(),
  smtpSecure: z.boolean().optional(),
  smtpPassword: z.string().trim().optional(),
});

export async function POST(
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
  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  // A blank secret here means "use whatever's already saved" (e.g.
  // testing after only changing the from-address) — fall back to the
  // persisted encrypted value rather than requiring it be retyped.
  const saved = await prisma.portalSettings.findUnique({
    where: { id: companyId },
    select: { resendApiKeyEncrypted: true, smtpPasswordEncrypted: true },
  });

  const config: TenantEmailProviderConfig = {
    emailProvider: data.emailProvider,
    emailFromAddress: data.emailFromAddress ?? null,
    resendApiKeyEncrypted: data.resendApiKey ? encryptSecret(data.resendApiKey) : saved?.resendApiKeyEncrypted ?? null,
    smtpHost: data.smtpHost ?? null,
    smtpPort: data.smtpPort ?? null,
    smtpUsername: data.smtpUsername ?? null,
    smtpPasswordEncrypted: data.smtpPassword ? encryptSecret(data.smtpPassword) : saved?.smtpPasswordEncrypted ?? null,
    smtpSecure: data.smtpSecure ?? true,
  };

  try {
    const result = await sendViaConfig(config, {
      to: data.to,
      subject: "Test email from your freight forwarder portal",
      html: "<p>This is a test email confirming your email provider configuration works.</p>",
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send test email.";
    return NextResponse.json({ sent: false, error: message }, { status: 200 });
  }
}
