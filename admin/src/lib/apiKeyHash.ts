import crypto from "crypto";

// Mirrored verbatim in ../../api/src/lib/apiKeyHash.ts — no shared package
// exists in this repo, so keep the two copies identical by hand.

function pepper(): string {
  const value = process.env.API_KEY_PEPPER;
  if (!value) throw new Error("API_KEY_PEPPER is not set.");
  return value;
}

export function generateApiKey(): string {
  return `cp_${crypto.randomBytes(32).toString("hex")}`;
}

// Deterministic (not bcrypt) so a presented key can be looked up by
// equality — the raw key already has 256 bits of entropy from
// generateApiKey(), so bcrypt's per-call salt/slowness buys nothing here
// and would make an indexed lookup impossible without a table scan.
export function hashApiKey(rawKey: string): string {
  return crypto.createHmac("sha256", pepper()).update(rawKey).digest("hex");
}

// First chars of the raw key, kept only for admin-facing display —
// the hash itself isn't human-legible.
export function apiKeyPreview(rawKey: string): string {
  return rawKey.slice(0, 10);
}
