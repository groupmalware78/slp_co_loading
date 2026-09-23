import crypto from "crypto";

// Mirrored verbatim in ../../warehouse/src/lib/settingsEncryption.ts — no
// shared package exists in this repo, so keep the two copies identical by
// hand (same convention as apiKeyHash.ts/email.ts elsewhere).
//
// The first REVERSIBLE secret this codebase stores (everything else —
// passwords, the tenant API key — is one-way hashed, since those are only
// ever compared, never sent anywhere). A tenant's own Resend API key or
// SMTP password has to be recovered in plaintext to actually send mail
// with it, so this uses AES-256-GCM instead of a hash.

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits, the GCM-recommended IV size

function key(): Buffer {
  const hex = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!hex) throw new Error("SETTINGS_ENCRYPTION_KEY is not set.");
  const buf = Buffer.from(hex, "hex");
  if (buf.length !== 32) {
    throw new Error("SETTINGS_ENCRYPTION_KEY must be 32 bytes (64 hex characters).");
  }
  return buf;
}

// Stored as "iv:authTag:ciphertext", each hex-encoded — one string column,
// self-contained (no need to store the IV/tag separately).
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptSecret(stored: string): string {
  const [ivHex, authTagHex, ciphertextHex] = stored.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("Malformed encrypted value.");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
