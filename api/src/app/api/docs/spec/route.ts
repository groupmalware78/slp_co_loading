import { NextResponse } from "next/server";
import { generateOpenApiDocument } from "@/lib/openapi/document";

// Public — this is the machine-readable contract, not a data endpoint.
export async function GET() {
  return NextResponse.json(generateOpenApiDocument());
}
