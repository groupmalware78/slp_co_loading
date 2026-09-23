import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

export async function GET(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "true";

  const faqs = await prisma.faqItem.findMany({
    where: { companyId, ...(activeOnly ? { active: true } : {}) },
    orderBy: [{ sortOrder: "asc" }, { question: "asc" }],
  });
  return NextResponse.json({ faqs });
}

const faqSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(300),
  subheader: z.string().trim().max(150).optional().nullable(),
  answer: z.string().trim().min(1, "Answer is required").max(2000),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function POST(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const body = await request.json().catch(() => null);
  const parsed = faqSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { question, subheader, answer, active, sortOrder } = parsed.data;

  const faq = await prisma.faqItem.create({
    data: { companyId, question, subheader: subheader || null, answer, active: active ?? true, sortOrder: sortOrder ?? 0 },
  });
  return NextResponse.json({ faq }, { status: 201 });
}
