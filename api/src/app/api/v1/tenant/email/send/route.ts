import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";
import { sendTenantEmail } from "@/lib/tenantEmailSender";

// Lets a customer-portal deployment send one of its own tenant-facing
// emails (signup verification, password reset, the contact form) through
// that tenant's own configured provider — see tenantEmailSender.ts for
// provider selection. customer-portal itself never holds a Resend/SMTP
// client or the encryption key; it only composes subject/HTML and calls
// this.
const sendSchema = z.object({
  to: z.string().trim().email(),
  subject: z.string().trim().min(1).max(200),
  html: z.string().min(1),
  replyTo: z.string().trim().email().optional(),
});

export async function POST(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const body = await request.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const result = await sendTenantEmail(companyId, parsed.data);
  return NextResponse.json(result);
}
