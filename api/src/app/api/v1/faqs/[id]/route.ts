import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

const faqSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(300),
  subheader: z.string().trim().max(150).optional().nullable(),
  answer: z.string().trim().min(1, "Answer is required").max(2000),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = faqSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { question, subheader, answer, active, sortOrder } = parsed.data;

  try {
    const faq = await prisma.faqItem.update({
      where: { id, companyId },
      data: { question, subheader: subheader || null, answer, active: active ?? true, sortOrder: sortOrder ?? 0 },
    });
    return NextResponse.json({ faq });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "FAQ not found." }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const { id } = await params;
  try {
    await prisma.faqItem.delete({ where: { id, companyId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "FAQ not found." }, { status: 404 });
    }
    throw err;
  }
  return NextResponse.json({ success: true });
}
