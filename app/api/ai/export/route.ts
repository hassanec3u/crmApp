import { NextRequest, NextResponse } from "next/server";
import { getProspectsActifsPourExport } from "@/lib/queries/ai-export";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[ai export] N8N_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.nextUrl.searchParams.get("userId") ?? undefined;
  const data = await getProspectsActifsPourExport(userId);
  return NextResponse.json(data);
}
