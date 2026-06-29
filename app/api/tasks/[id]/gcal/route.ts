import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { googleCalendarEventId } = body as { googleCalendarEventId?: unknown };
  if (!googleCalendarEventId || typeof googleCalendarEventId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid googleCalendarEventId" },
      { status: 400 },
    );
  }

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await prisma.task.update({
    where: { id: params.id },
    data: { googleCalendarEventId },
  });

  return NextResponse.json({ ok: true });
}
