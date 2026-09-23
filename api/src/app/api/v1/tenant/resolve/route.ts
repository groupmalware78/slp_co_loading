import { NextRequest, NextResponse } from "next/server";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

// Replaces customer-portal's local getTenantCompanyId() — "which company
// is this deployment, and is it still active" — see lib/internalAuth.ts
// for why the same x-api-key header both authenticates the caller and
// resolves the tenant in one lookup.
export async function GET(request: NextRequest) {
  try {
    const { companyId } = await requireInternalAuth(request);
    return NextResponse.json({ companyId });
  } catch (err) {
    return internalAuthErrorResponse(err);
  }
}
