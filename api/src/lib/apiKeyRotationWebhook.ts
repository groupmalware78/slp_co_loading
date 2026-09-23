import crypto from "crypto";

// Pushes a freshly automatically-rotated raw key to a tenant's own
// customer-portal deployment (POST src/app/api/internal/api-key-rotated/
// route.ts there), signed so that receiver can verify it without already
// holding the (just-changed) API key. Not fatal on failure — the 48h
// grace period set by rotateApiKey() is the fallback, and customer-
// portal's own apiKeyStatusPoller surfaces the problem to an operator.
export async function deliverRotationWebhook(params: {
  url: string;
  secret: string;
  companyId: string;
  apiKey: string;
  rotatedAt: Date;
  gracePeriodEndsAt: Date | null;
}): Promise<{ delivered: boolean; attempts: number }> {
  const body = JSON.stringify({
    companyId: params.companyId,
    apiKey: params.apiKey,
    rotatedAt: params.rotatedAt.toISOString(),
    gracePeriodEndsAt: params.gracePeriodEndsAt?.toISOString() ?? null,
  });
  const signature = crypto.createHmac("sha256", params.secret).update(body).digest("hex");

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(params.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-webhook-signature": signature },
        body,
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return { delivered: true, attempts: attempt };
      console.error(
        `[apiKeyRotation] webhook to ${params.url} returned ${res.status} (attempt ${attempt})`
      );
    } catch (err) {
      console.error(`[apiKeyRotation] webhook to ${params.url} threw (attempt ${attempt}):`, err);
    }
  }
  return { delivered: false, attempts: 2 };
}
