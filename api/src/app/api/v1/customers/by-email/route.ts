import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

// Used by signup, my-shipments, and mobile shipments — "does a Customer
// record already exist for this tenant+email".
export async function GET(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const email = request.nextUrl.searchParams.get("email")?.trim();
  if (!email) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({ where: { companyId, email } });
  return NextResponse.json({ customer });
}
