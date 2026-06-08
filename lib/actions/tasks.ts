/** Server Actions — Tâches / rappels (CRUD unifié). */
"use server";

import { HistoriqueType, TaskType } from "@prisma/client";
import { addDays } from "date-fns";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/prospects";
import { TASK_TYPE_LABELS } from "@/lib/constants/tasks";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  findAccessibleProspect,
  findAccessibleTask,
  resolveAssigneeId,
} from "@/lib/tasks/access";
import { revalidateTaskPaths } from "@/lib/tasks/revalidate";

/** Identifie une tâche existante (utilisé par delete/markDone/toggle). */
const taskIdSchema = z.object({ taskId: z.string().cuid() });

const taskTypeSchema = z.nativeEnum(TaskType);

/** Champs communs à la création et à la modification d'une tâche. */
const taskFieldsSchema = z.object({
  type: taskTypeSchema,
  titre: z.string().trim().min(1).max(150),
  commentaire: z.string().trim().max(2000).optional().or(z.literal("")),
  date: z.string().min(1, "La date est obligatoire"),
  heure: z.string().optional().or(z.literal("")),
  assignedUserId: z.string().cuid().optional(),
});

const createTaskSchema = taskFieldsSchema.extend({
  prospectId: z.string().cuid(),
});

const updateTaskSchema = taskFieldsSchema.extend({
  taskId: z.string().cuid(),
});

/** Report d'une tâche : nouvelle date optionnelle (sinon, lendemain par défaut). */
const postponeTaskSchema = z.object({
  taskId: z.string().cuid(),
  date: z.string().optional(),
});

const searchProspectsSchema = z.object({
  q: z.string().trim().max(100),
});

/** Recherche de prospects (autocomplétion) pour rattacher une nouvelle tâche. */

export async function searchProspectsForTask(
  input: z.infer<typeof searchProspectsSchema>,
): Promise<
  ActionResult<
    Array<{ id: string; nom: string; prenom: string | null; email: string | null }>
  >
> {
  const session = await requireSession();
  const parsed = searchProspectsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Validation échouée" };

  const term = parsed.data.q;
  if (term.length < 2) {
    return { ok: true, data: [] };
  }

  const prospects = await prisma.prospect.findMany({
    where: {
      ...(session.user.role === "ADMIN" || session.user.role === "MANAGER"
        ? {}
        : { userId: session.user.id }),
      OR: [
        { nom: { contains: term, mode: "insensitive" } },
        { prenom: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { telephone: { contains: term, mode: "insensitive" } },
      ],
    },
    select: { id: true, nom: true, prenom: true, email: true },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  return { ok: true, data: prospects };
}

/** Crée une tâche rattachée à un prospect et journalise l'action dans l'historique. */
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

  const prospect = await findAccessibleProspect(parsed.data.prospectId, session);
  if (!prospect) return { ok: false, error: "Prospect introuvable" };

  const assigneeId = await resolveAssigneeId(
    parsed.data.assignedUserId,
    session,
  );
  if (!assigneeId) {
    return { ok: false, error: "Collaborateur invalide" };
  }

  try {
    const task = await prisma.task.create({
      data: {
        type: parsed.data.type,
        titre: parsed.data.titre,
        commentaire: parsed.data.commentaire?.trim() || null,
        date: new Date(parsed.data.date),
        heure: parsed.data.heure?.trim() || null,
        prospectId: prospect.id,
        assignedUserId: assigneeId,
      },
    });

    const typeLabel = TASK_TYPE_LABELS[parsed.data.type];
    await prisma.historiqueAction.create({
      data: {
        type: HistoriqueType.TASK_CREATED,
        contenu: `${typeLabel} créé : ${parsed.data.titre}`,
        prospectId: prospect.id,
        userId: session.user.id,
      },
    });

    revalidateTaskPaths(prospect.id);
    return { ok: true, data: { id: task.id } };
  } catch (error) {
    console.error("[createTask]", error);
    return { ok: false, error: "Impossible de créer le rappel" };
  }
}

/** Modifie les champs d'une tâche existante (l'utilisateur doit y avoir accès). */
export async function updateTask(
  input: z.infer<typeof updateTaskSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Validation échouée",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };

  const task = await findAccessibleTask(parsed.data.taskId, session);
  if (!task) return { ok: false, error: "Tâche introuvable" };

  const assigneeId = await resolveAssigneeId(
    parsed.data.assignedUserId ?? task.assignedUserId,
    session,
  );
  if (!assigneeId) {
    return { ok: false, error: "Collaborateur invalide" };
  }

  try {
    await prisma.task.update({
      where: { id: task.id },
      data: {
        type: parsed.data.type,
        titre: parsed.data.titre,
        commentaire: parsed.data.commentaire?.trim() || null,
        date: new Date(parsed.data.date),
        heure: parsed.data.heure?.trim() || null,
        assignedUserId: assigneeId,
      },
    });

    await prisma.historiqueAction.create({
      data: {
        type: HistoriqueType.OTHER,
        contenu: `Rappel modifié : ${parsed.data.titre}`,
        prospectId: task.prospectId,
        userId: session.user.id,
      },
    });

    revalidateTaskPaths(task.prospectId);
    return { ok: true, data: { id: task.id } };
  } catch (error) {
    console.error("[updateTask]", error);
    return { ok: false, error: "Impossible de modifier le rappel" };
  }
}

/** Supprime définitivement une tâche et trace la suppression dans l'historique. */
export async function deleteTask(
  input: z.infer<typeof taskIdSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Validation échouée" };

  const task = await findAccessibleTask(parsed.data.taskId, session);
  if (!task) return { ok: false, error: "Tâche introuvable" };

  try {
    await prisma.task.delete({ where: { id: task.id } });

    await prisma.historiqueAction.create({
      data: {
        type: HistoriqueType.OTHER,
        contenu: `Rappel supprimé : ${task.titre}`,
        prospectId: task.prospectId,
        userId: session.user.id,
      },
    });

    revalidateTaskPaths(task.prospectId);
    return { ok: true, data: { id: task.id } };
  } catch (error) {
    console.error("[deleteTask]", error);
    return { ok: false, error: "Impossible de supprimer le rappel" };
  }
}

/** Marque une tâche comme terminée (idempotent : ne fait rien si déjà faite). */
export async function markTaskDone(
  input: z.infer<typeof taskIdSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Validation échouée" };

  const task = await findAccessibleTask(parsed.data.taskId, session);
  if (!task) return { ok: false, error: "Tâche introuvable" };
  if (task.fait) return { ok: true, data: { id: task.id } };

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

    revalidateTaskPaths(task.prospectId);
    return { ok: true, data: { id: task.id } };
  } catch (error) {
    console.error("[markTaskDone]", error);
    return { ok: false, error: "Impossible de terminer la tâche" };
  }
}

/** Inverse l'état fait/à faire d'une tâche (case à cocher dans les listes). */
export async function toggleTask(
  input: z.infer<typeof taskIdSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Validation échouée" };

  const task = await findAccessibleTask(parsed.data.taskId, session);
  if (!task) return { ok: false, error: "Tâche introuvable" };

  try {
    const newFait = !task.fait;
    await prisma.task.update({
      where: { id: task.id },
      data: { fait: newFait },
    });

    await prisma.historiqueAction.create({
      data: {
        type: newFait ? HistoriqueType.TASK_DONE : HistoriqueType.OTHER,
        contenu: newFait
          ? `Rappel terminé : ${task.titre}`
          : `Rappel réouvert : ${task.titre}`,
        prospectId: task.prospectId,
        userId: session.user.id,
      },
    });

    revalidateTaskPaths(task.prospectId);
    return { ok: true, data: { id: task.id } };
  } catch (error) {
    console.error("[toggleTask]", error);
    return { ok: false, error: "Impossible de modifier le rappel" };
  }
}

/** Reporte une tâche à une date donnée (par défaut : le lendemain) et la rouvre. */
export async function postponeTask(
  input: z.infer<typeof postponeTaskSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = postponeTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Validation échouée" };

  const task = await findAccessibleTask(parsed.data.taskId, session);
  if (!task) return { ok: false, error: "Tâche introuvable" };

  // Pas de date fournie → on reporte au jour suivant par défaut.
  const newDate = parsed.data.date
    ? new Date(parsed.data.date)
    : addDays(new Date(), 1);

  try {
    await prisma.task.update({
      where: { id: task.id },
      data: { date: newDate, fait: false },
    });

    await prisma.historiqueAction.create({
      data: {
        type: HistoriqueType.OTHER,
        contenu: `Rappel reporté au ${formatDate(newDate)} : ${task.titre}`,
        prospectId: task.prospectId,
        userId: session.user.id,
      },
    });

    revalidateTaskPaths(task.prospectId);
    return { ok: true, data: { id: task.id } };
  } catch (error) {
    console.error("[postponeTask]", error);
    return { ok: false, error: "Impossible de reporter la tâche" };
  }
}
