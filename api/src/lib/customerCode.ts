import { prisma } from "./prisma";

const SEQUENCE_LENGTH = 5;
const MAX_ATTEMPTS = 50;

// "{company code}-{5-digit sequence}", e.g. "SLP-00001" — shown to the
// customer as part of their shipping address (their "suite number").
// Starts from this company's current customer count and increments on
// collision rather than relying on gapless sequencing, matching the retry
// pattern admin uses for its own company codes. Ported from
// customer-portal/src/lib/customerCode.ts when that app lost direct DB
// access — customer creation (and code assignment) now happens here.
export async function generateCustomerCode(companyId: string): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { code: true },
  });
  if (!company) throw new Error("Company not found while generating customer code.");

  const startingCount = await prisma.customer.count({ where: { companyId } });

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const sequence = String(startingCount + 1 + attempt).padStart(SEQUENCE_LENGTH, "0");
    const candidate = `${company.code}-${sequence}`;
    const existing = await prisma.customer.findUnique({ where: { customerCode: candidate } });
    if (!existing) return candidate;
  }

  throw new Error("Could not generate a unique customer code.");
}
