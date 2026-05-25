/** Server Actions — Tâches / rappels (création rapide depuis la fiche prospect). */
"use server";

import { HistoriqueType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

import type { ActionResult } from "@/lib/actions/prospects";

const createTaskSchema = z.object({
  prospectId: z.string().cuid(),
  titre: z.string().trim().min(1).max(150),
  commentaire: z.string().trim().max(2000).optional().or(z.literal("")),
  date: z.string().min(1, "La date est obligatoire"),
  heure: z.string().optional().or(z.literal("")),
});

export async function createTask(
  input: z.infer<typeof createTaskSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Validation échouée",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };

  const prospect = await prisma.prospect.findFirst({
    where: { id: parsed.data.prospectId, userId: session.user.id },
    select: { id: true },
  });
  if (!prospect) return { ok: false, error: "Prospect introuvable" };

  try {
    const task = await prisma.task.create({
      data: {
        titre: parsed.data.titre,
        commentaire: parsed.data.commentaire?.trim() || null,
        date: new Date(parsed.data.date),
        heure: parsed.data.heure?.trim() || null,
        prospectId: prospect.id,
        assignedUserId: session.user.id,
      },
    });

    await prisma.historiqueAction.create({
      data: {
        type: HistoriqueType.TASK_CREATED,
        contenu: `Rappel créé : ${parsed.data.titre}`,
        prospectId: prospect.id,
        userId: session.user.id,
      },
    });

    revalidatePath(`/prospects/${prospect.id}`);
    return { ok: true, data: { id: task.id } };
  } catch (error) {
    console.error("[createTask]", error);
    return { ok: false, error: "Impossible de créer le rappel" };
  }
}

const toggleTaskSchema = z.object({
  taskId: z.string().cuid(),
});

export async function toggleTask(
  input: z.infer<typeof toggleTaskSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = toggleTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Validation échouée" };

  const task = await prisma.task.findFirst({
    where: { id: parsed.data.taskId, assignedUserId: session.user.id },
    select: { id: true, fait: true, prospectId: true, titre: true },
  });
  if (!task) return { ok: false, error: "Tâche introuvable" };

  try {
    await prisma.task.update({
      where: { id: task.id },
      data: { fait: !task.fait },
    });

    await prisma.historiqueAction.create({
      data: {
        type: task.fait ? HistoriqueType.OTHER : HistoriqueType.TASK_DONE,
        contenu: task.fait
          ? `Rappel réouvert : ${task.titre}`
          : `Rappel terminé : ${task.titre}`,
        prospectId: task.prospectId,
        userId: session.user.id,
      },
    });

    revalidatePath(`/prospects/${task.prospectId}`);
    return { ok: true, data: { id: task.id } };
  } catch (error) {
    console.error("[toggleTask]", error);
    return { ok: false, error: "Impossible de modifier le rappel" };
  }
}
