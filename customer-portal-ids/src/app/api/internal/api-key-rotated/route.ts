import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/apiClient";
import { writeRuntimeApiKey } from "@/lib/apiKeyStore";

// Receives a freshly-rotated raw key pushed by api/'s automatic-rotation
// scheduler (see api/src/lib/apiKeyRotationScheduler.ts +
// apiKeyRotationWebhook.ts) when this deployment's key rotates on
// schedule rather than via a manual "Rotate" click. Verifies an
// HMAC-SHA256 signature (API_KEY_WEBHOOK_SECRET, set here to match the
// value admin configured on this company's Access panel) since this
// route can't itself be protected by the API key it's delivering.
export async function POST(request: NextRequest) {
  const secret = process.env.API_KEY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature");
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const signatureBuffer = signature ? Buffer.from(signature) : null;
  const expectedBuffer = Buffer.from(expected);
  const signatureValid =
    signatureBuffer !== null &&
    signatureBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  if (!signatureValid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const { apiKey } = JSON.parse(rawBody) as { apiKey?: string };
  if (!apiKey) {
    return NextResponse.json({ error: "Missing apiKey." }, { status: 400 });
  }

  // Throwing here (e.g. an unwritable filesystem) surfaces as a 500,
  // which api/'s webhook sender treats as a failed delivery and retries
  // once — see apiKeyRotationWebhook.ts. Not fatal beyond that: the 48h
  // grace period is the fallback if delivery never succeeds.
  writeRuntimeApiKey(apiKey);
  apiClient.setApiKey(apiKey);

  return NextResponse.json({ success: true });
}
