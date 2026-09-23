import { apiClient } from "./apiClient";

// A signal, not a secret-redelivery path: if api/'s automatic-rotation
// webhook push failed (this deployment was down, network hiccup, etc.),
// GET /v1/tenant/api-key's usedPreviousKey tells us we're still running on
// a grace-period key. There is no raw key to recover here — we can only
// surface the problem so an operator rotates manually via /admin/api-key
// (which still works, since the old key remains valid during the grace
// window) or fixes the webhook config.
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

let lastWarnedAt = 0;
const WARN_COOLDOWN_MS = 30 * 60 * 1000;

async function tick() {
  try {
    const status = await apiClient.tenant.apiKeyStatus();
    if (status.usedPreviousKey && Date.now() - lastWarnedAt > WARN_COOLDOWN_MS) {
      lastWarnedAt = Date.now();
      console.error(
        "[api-key] This deployment is running on a rotated-out grace-period key — " +
          "automatic-rotation webhook delivery may have failed. Rotate manually via " +
          "/admin/api-key, or check this company's apiKeyWebhookUrl/apiKeyWebhookSecret " +
          `config and this app's own API_KEY_WEBHOOK_SECRET. Grace period ends ${status.gracePeriodEndsAt}.`
      );
    }
  } catch (err) {
    console.error("[api-key] status poller tick failed:", err);
  }
}

const globalForPoller = globalThis as unknown as {
  apiKeyStatusPollerStarted?: boolean;
};

export function startApiKeyStatusPoller() {
  if (globalForPoller.apiKeyStatusPollerStarted) return;
  globalForPoller.apiKeyStatusPollerStarted = true;
  setInterval(tick, CHECK_INTERVAL_MS);
  console.log("[api-key] status poller started, checking every 5m");
}
