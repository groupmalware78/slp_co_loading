import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import type { PortalRole } from "@prisma/client";
import { prisma } from "./prisma";

// Separate from Service-Provider/Warehouse's own staff sessions (an
// encrypted cookie meant for a browser) — the mobile app has no cookie
// jar, so it authenticates with a plain bearer JWT instead, signed with
// its own secret. Ported from customer-portal's old lib/mobileAuth.ts —
// same design, now backed by direct Prisma reads instead of a REST call
// back into this same app.
const MOBILE_TOKEN_TTL = "30d";

function mobileSecret(): Uint8Array {
  const secret = process.env.MOBILE_JWT_SECRET;
  if (!secret) {
    throw new Error("MOBILE_JWT_SECRET is not set.");
  }
  return new TextEncoder().encode(secret);
}

export interface MobileTokenPayload {
  sub: string;
  role: PortalRole;
  companyId: string;
}

export async function signMobileToken(payload: MobileTokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role, companyId: payload.companyId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(MOBILE_TOKEN_TTL)
    .sign(mobileSecret());
}

export interface MobileSession {
  userId: string;
  role: PortalRole;
  companyId: string;
  name: string;
  email: string;
}

// Verifies the bearer token AND re-checks the account is still active on
// every call (an extra indexed lookup, but it means deactivating a
// driver/customer account takes effect immediately instead of only once a
// 30-day token happens to expire).
export async function getMobileSession(request: NextRequest): Promise<MobileSession | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  let payload: MobileTokenPayload;
  try {
    const result = await jwtVerify(token, mobileSecret());
    payload = {
      sub: result.payload.sub as string,
      role: result.payload.role as PortalRole,
      companyId: result.payload.companyId as string,
    };
  } catch {
    return null;
  }

  const user = await prisma.portalUser.findUnique({ where: { id: payload.sub } });
  if (!user || !user.active || user.companyId !== payload.companyId) return null;

  return {
    userId: user.id,
    role: user.role,
    companyId: user.companyId,
    name: user.name,
    email: user.email,
  };
}

export function mobileUnauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function mobileForbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}
