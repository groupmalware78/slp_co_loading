import crypto from "crypto";

// A 6-digit one-time password, used as a new company's initial portal
// admin password — short enough to type from an email, long enough
// (1M possibilities) that it's not meaningfully guessable in the single
// login attempt before it's replaced by a real password.
export function generateOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}
