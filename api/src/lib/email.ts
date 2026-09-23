import { Resend } from "resend";
import { sendTenantEmail } from "./tenantEmailSender";

interface RegistrationEmailInput {
  to: string;
  contactName: string;
  companyName: string;
  companyCode: string;
  apiKey: string;
  otp: string;
}

// Falls back to logging the credentials to the server console when
// RESEND_API_KEY isn't configured, so the registration flow is fully
// testable before real email sending is wired up with a live key.
export async function sendCompanyRegistrationEmail(
  input: RegistrationEmailInput
): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  if (!apiKey) {
    console.log(
      `[email] RESEND_API_KEY not set — would have emailed ${input.to}:\n` +
        `  Company: ${input.companyName} (${input.companyCode})\n` +
        `  TENANT_API_KEY: ${input.apiKey}\n` +
        `  Temporary password (OTP): ${input.otp}`
    );
    return { sent: false };
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: input.to,
    subject: `${input.companyName} is registered — set up your customer portal`,
    html: `
      <p>Hi ${input.contactName},</p>
      <p><strong>${input.companyName}</strong> (${input.companyCode}) has been registered.</p>
      <p>Use these to finish setting up your customer-portal deployment:</p>
      <ul>
        <li><strong>TENANT_API_KEY</strong> (add this to that deployment's <code>.env</code> as
          <code>TENANT_API_KEY</code> and restart it): <code>${input.apiKey}</code></li>
        <li><strong>Portal login email</strong>: ${input.to}</li>
        <li><strong>Temporary password</strong>: ${input.otp}</li>
      </ul>
      <p>Once that deployment is restarted with the key set, log in with the email and temporary
      password above — you'll be asked to set a new password immediately.</p>
    `,
  });

  return { sent: true };
}

interface PasswordResetEmailInput {
  to: string;
  name: string;
  resetUrl: string;
}

// Falls back to logging the link to the server console when
// RESEND_API_KEY isn't configured, same as sendCompanyRegistrationEmail.
export async function sendPasswordResetEmail(
  input: PasswordResetEmailInput
): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  if (!apiKey) {
    console.log(
      `[email] RESEND_API_KEY not set — would have emailed ${input.to}:\n` +
        `  Reset your password: ${input.resetUrl}`
    );
    return { sent: false };
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: input.to,
    subject: "Reset your password",
    html: `
      <p>Hi ${input.name},</p>
      <p>We received a request to reset your password. Click the link below to choose a new one:</p>
      <p><a href="${input.resetUrl}">${input.resetUrl}</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  return { sent: true };
}

export type PackageStatusEmailStatus = "RECEIVED" | "SHIPPED" | "READY_FOR_PICKUP" | "DELIVERED";

const STATUS_EMAIL_COPY: Record<PackageStatusEmailStatus, { subject: string; body: string }> = {
  RECEIVED: {
    subject: "Package received at our warehouse",
    body: "We've received your package at our warehouse and it's now being processed.",
  },
  SHIPPED: {
    subject: "Your package has shipped",
    body: "Your package has shipped and is on its way to us.",
  },
  READY_FOR_PICKUP: {
    subject: "Your package is ready for pickup",
    body: "Your package is ready for pickup. An invoice is attached for your records.",
  },
  DELIVERED: {
    subject: "Your package has been delivered",
    body: "Your package has been delivered. Thanks for shipping with us!",
  },
};

interface PackageStatusEmailInput {
  companyId: string;
  to: string;
  customerName: string;
  companyName: string;
  trackingNumber: string;
  description: string | null;
  status: PackageStatusEmailStatus;
  attachment?: { filename: string; content: Buffer } | null;
}

// Composes the subject/HTML here, delegates actual delivery (provider
// selection: this tenant's own Resend/SMTP config, or the platform
// default) to tenantEmailSender.ts. Mirrors ../admin's own copy of
// this function — no shared package exists in this repo, so keep the two
// duplicates identical by hand.
export async function sendPackageStatusEmail(
  input: PackageStatusEmailInput
): Promise<{ sent: boolean }> {
  const copy = STATUS_EMAIL_COPY[input.status];

  return sendTenantEmail(input.companyId, {
    to: input.to,
    subject: `${copy.subject} — ${input.companyName}`,
    html: `
      <p>Hi ${input.customerName},</p>
      <p>${copy.body}</p>
      <div style="margin-top: 16px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <p style="margin: 0; font-weight: 600;">${input.description || input.trackingNumber}</p>
        <p style="margin: 4px 0 0; color: #64748b;">Tracking number: ${input.trackingNumber}</p>
      </div>
    `,
    ...(input.attachment ? { attachments: [input.attachment] } : {}),
  });
}
