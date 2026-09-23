import { Resend } from "resend";
import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { decryptSecret } from "./settingsEncryption";

// Mirrored verbatim in ../../warehouse/src/lib/tenantEmailSender.ts — no
// shared package exists in this repo. This is the one place that actually
// dispatches a tenant-facing email; api/'s own lib/email.ts (subject/HTML
// composition) and customer-portal's (via POST /v1/tenant/email/send)
// both funnel through here so provider selection lives in exactly one
// place per app.
export interface TenantEmailMessage {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer }[];
}

export interface TenantEmailProviderConfig {
  emailProvider: "RESEND" | "SMTP" | null;
  emailFromAddress: string | null;
  resendApiKeyEncrypted: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  smtpPasswordEncrypted: string | null;
  smtpSecure: boolean;
}

const PLATFORM_FROM = () => process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

// The Resend SDK does NOT throw on an API error (bad key, bad from
// address, etc.) — it resolves with { data: null, error: {...} }.
// Confirmed directly: a bad key still resolves successfully with the
// error tucked into the response. Every call site below must check this
// explicitly or a misconfigured key silently "succeeds."
function throwIfResendError(result: { data: unknown; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
}

// Falls back to the platform's shared RESEND_API_KEY — same "log instead
// of send" dev fallback as every other email function in this repo — when
// no tenant provider is configured, or the configured provider is missing
// its required secret (e.g. mid-setup, or DB drift).
async function sendViaPlatformDefault(message: TenantEmailMessage): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email] RESEND_API_KEY not set — would have emailed ${message.to}: ${message.subject}`);
    return { sent: false };
  }
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: PLATFORM_FROM(),
    to: message.to,
    subject: message.subject,
    html: message.html,
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    ...(message.attachments?.length ? { attachments: message.attachments } : {}),
  });
  throwIfResendError(result);
  return { sent: true };
}

async function sendViaResend(
  config: TenantEmailProviderConfig,
  message: TenantEmailMessage
): Promise<{ sent: boolean }> {
  if (!config.resendApiKeyEncrypted) return sendViaPlatformDefault(message);

  const resend = new Resend(decryptSecret(config.resendApiKeyEncrypted));
  const result = await resend.emails.send({
    from: config.emailFromAddress || PLATFORM_FROM(),
    to: message.to,
    subject: message.subject,
    html: message.html,
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    ...(message.attachments?.length ? { attachments: message.attachments } : {}),
  });
  throwIfResendError(result);
  return { sent: true };
}

async function sendViaSmtp(
  config: TenantEmailProviderConfig,
  message: TenantEmailMessage
): Promise<{ sent: boolean }> {
  if (!config.smtpHost || !config.smtpPort || !config.smtpPasswordEncrypted) {
    return sendViaPlatformDefault(message);
  }

  const transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: config.smtpUsername
      ? { user: config.smtpUsername, pass: decryptSecret(config.smtpPasswordEncrypted) }
      : undefined,
  });

  await transport.sendMail({
    from: config.emailFromAddress || PLATFORM_FROM(),
    to: message.to,
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    subject: message.subject,
    html: message.html,
    ...(message.attachments?.length
      ? { attachments: message.attachments.map((a) => ({ filename: a.filename, content: a.content })) }
      : {}),
  });
  return { sent: true };
}

// Sends via `config` directly, without touching the database — used by
// the test-send endpoint to try a candidate (not-yet-saved) configuration.
export async function sendViaConfig(
  config: TenantEmailProviderConfig,
  message: TenantEmailMessage
): Promise<{ sent: boolean }> {
  if (config.emailProvider === "RESEND") return sendViaResend(config, message);
  if (config.emailProvider === "SMTP") return sendViaSmtp(config, message);
  return sendViaPlatformDefault(message);
}

// The normal call path: loads the company's saved settings, then sends.
export async function sendTenantEmail(
  companyId: string,
  message: TenantEmailMessage
): Promise<{ sent: boolean }> {
  const settings = await prisma.portalSettings.findUnique({
    where: { id: companyId },
    select: {
      emailProvider: true,
      emailFromAddress: true,
      resendApiKeyEncrypted: true,
      smtpHost: true,
      smtpPort: true,
      smtpUsername: true,
      smtpPasswordEncrypted: true,
      smtpSecure: true,
    },
  });

  if (!settings) return sendViaPlatformDefault(message);
  return sendViaConfig(settings, message);
}
