import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Unauthenticated on purpose — this is the one endpoint a platform health
// check (Railway, an uptime monitor, a load balancer) can hit without an
// x-api-key, unlike every /v1/** route (see internalAuth.ts). Checks the
// database round-trip too, not just "the process is up", so a Postgres
// outage actually fails the check instead of reporting healthy.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[health] database check failed:", err);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
