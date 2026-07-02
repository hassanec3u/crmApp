import { NextRequest, NextResponse } from "next/server";
import { PriorityScore } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const priorityEntrySchema = z.object({
  prospectId: z.string().cuid(),
  score: z.nativeEnum(PriorityScore),
  raison: z.string().trim().min(1).max(1000),
});

const bodySchema = z.array(z.unknown());

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[ai priorities callback] N8N_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  let upserted = 0;
  let skipped = 0;

  for (const rawEntry of parsed.data) {
    const entryParsed = priorityEntrySchema.safeParse(rawEntry);
    if (!entryParsed.success) {
      skipped += 1;
      continue;
    }
    const entry = entryParsed.data;

    const prospect = await prisma.prospect.findUnique({
      where: { id: entry.prospectId },
      select: { id: true },
    });
    if (!prospect) {
      skipped += 1;
      continue;
    }

    await prisma.prospectPriority.upsert({
      where: { prospectId: entry.prospectId },
      create: {
        prospectId: entry.prospectId,
        score: entry.score,
        raison: entry.raison,
      },
      update: {
        score: entry.score,
        raison: entry.raison,
        computedAt: new Date(),
      },
    });
    upserted += 1;
  }

  return NextResponse.json({ ok: true, upserted, skipped });
}
