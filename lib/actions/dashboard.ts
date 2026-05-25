/**
 * Server Actions pour le dashboard — actions rapides sur les tâches.
 */
"use server";

import { HistoriqueType } from "@prisma/client";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

import type { ActionResult } from "@/lib/actions/prospects";

const taskIdSchema = z.object({ taskId: z.string().cuid() });

/**
 * Marquer une tâche comme faite depuis le dashboard.
 */
export async function markTaskDone(
  input: z.infer<typeof taskIdSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Validation échouée" };

  const task = await prisma.task.findFirst({
    where: { id: parsed.data.taskId, assignedUserId: session.user.id },
    select: { id: true, prospectId: true, titre: true },
  });
  if (!task) return { ok: false, error: "Tâche introuvable" };

  try {
    await prisma.task.update({
      where: { id: task.id },
      data: { fait: true },
    });

    await prisma.historiqueAction.create({
      data: {
        type: HistoriqueType.TASK_DONE,
        contenu: `Rappel terminé : ${task.titre}`,
        prospectId: task.prospectId,
        userId: session.user.id,
      },
    });

    revalidatePath("/dashboard");
    return { ok: true, data: { id: task.id } };
  } catch (error) {
    console.error("[markTaskDone]", error);
    return { ok: false, error: "Impossible de terminer la tâche" };
  }
}

/**
 * Reporter une tâche à demain.
 */
export async function postponeTask(
  input: z.infer<typeof taskIdSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Validation échouée" };

  const task = await prisma.task.findFirst({
    where: { id: parsed.data.taskId, assignedUserId: session.user.id },
    select: { id: true, prospectId: true, titre: true, date: true },
  });
  if (!task) return { ok: false, error: "Tâche introuvable" };

  try {
    const tomorrow = addDays(new Date(), 1);
    await prisma.task.update({
      where: { id: task.id },
      data: { date: tomorrow },
    });

    await prisma.historiqueAction.create({
      data: {
        type: HistoriqueType.OTHER,
        contenu: `Rappel reporté à demain : ${task.titre}`,
        prospectId: task.prospectId,
        userId: session.user.id,
      },
    });

    revalidatePath("/dashboard");
    return { ok: true, data: { id: task.id } };
  } catch (error) {
    console.error("[postponeTask]", error);
    return { ok: false, error: "Impossible de reporter la tâche" };
  }
}

const createQuickReminderSchema = z.object({
  prospectId: z.string().cuid(),
  titre: z.string().trim().min(1).max(150).optional(),
});

/**
 * Créer un rappel rapide depuis le widget "Prospects à relancer".
 * Crée un rappel pour demain par défaut.
 */
export async function createQuickReminder(
  input: z.infer<typeof createQuickReminderSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = createQuickReminderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Validation échouée" };

  const prospect = await prisma.prospect.findFirst({
    where: { id: parsed.data.prospectId, userId: session.user.id },
    select: { id: true, nom: true, prenom: true },
  });
  if (!prospect) return { ok: false, error: "Prospect introuvable" };

  const titre =
    parsed.data.titre || `Relancer ${prospect.prenom ?? ""} ${prospect.nom}`.trim();
  const tomorrow = addDays(new Date(), 1);

  try {
    const task = await prisma.task.create({
      data: {
        titre,
        date: tomorrow,
        heure: "09:00",
        prospectId: prospect.id,
        assignedUserId: session.user.id,
      },
    });

    await prisma.historiqueAction.create({
      data: {
        type: HistoriqueType.TASK_CREATED,
        contenu: `Rappel créé depuis le dashboard : ${titre}`,
        prospectId: prospect.id,
        userId: session.user.id,
      },
    });

    revalidatePath("/dashboard");
    return { ok: true, data: { id: task.id } };
  } catch (error) {
    console.error("[createQuickReminder]", error);
    return { ok: false, error: "Impossible de créer le rappel" };
  }
}
