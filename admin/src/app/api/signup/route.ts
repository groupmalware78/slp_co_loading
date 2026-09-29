import { NextRequest, NextResponse } from "next/server";
import { companySchema } from "@/lib/companySchema";
import { registerCompany, CompanyRegistrationError } from "@/lib/companyRegistration";

// Public self-service company registration — no session required, unlike
// POST /api/companies (staff-only). Same validation/creation logic as
// that route (see registerCompany()), but deliberately never returns the
// raw apiKey/otp in the response body: an anonymous caller could type in
// anyone's contactEmail, so those credentials only ever go to the
// verified inbox via email, never back to whoever submitted the form.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = companySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { code, name, contactName, contactEmail, contactPhone, address, trn } = parsed.data;
  if (!code) {
    return NextResponse.json({ error: "Company code is required." }, { status: 400 });
  }

  try {
    await registerCompany(
      { code, name, contactName, contactEmail, contactPhone, address, trn },
      null
    );
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    if (err instanceof CompanyRegistrationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
