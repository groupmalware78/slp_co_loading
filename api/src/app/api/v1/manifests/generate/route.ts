import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";
import { generateManifest } from "@/lib/manifest";

const schema = z.object({ triggeredBy: z.enum(["MANUAL", "SCHEDULE"]).optional() });

export async function POST(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const triggeredBy = parsed.success ? (parsed.data.triggeredBy ?? "MANUAL") : "MANUAL";

  const manifest = await generateManifest(triggeredBy, companyId);
  return NextResponse.json({ manifest }, { status: 201 });
}
