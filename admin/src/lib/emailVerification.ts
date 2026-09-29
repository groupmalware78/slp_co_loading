import { prisma } from "./prisma";

// Mirrors api/'s POST /v1/portal-users/email-verification/consume exactly
// (same token/expiry semantics), but via direct Prisma — admin has its
// own DB connection and doesn't go through api/'s REST layer for its own
// local operations (see registerCompany() for where this token is
// issued). Not scoped to a companyId the way api/'s version is (it has
// one from the caller's x-api-key; admin's /verify-email has no such
// context), but the token itself is a 32-byte random value unique per
// user, so a bare lookup is equally safe.
export async function consumeEmailVerification(token: string): Promise<{ ok: boolean; error?: string }> {
  const user = await prisma.portalUser.findUnique({ where: { emailVerificationToken: token } });
  if (!user || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
    return { ok: false, error: "This verification link is invalid or has expired." };
  }

  await prisma.portalUser.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });

  return { ok: true };
}
