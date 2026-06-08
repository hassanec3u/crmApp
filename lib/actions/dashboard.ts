/**
 * Server Actions pour le dashboard — délègue aux actions tâches unifiées.
 */
"use server";

import { TaskType } from "@prisma/client";
import { addDays } from "date-fns";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/prospects";
import { createTask } from "@/lib/actions/tasks";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

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

  return createTask({
    prospectId: prospect.id,
    type: TaskType.RELANCE,
    titre,
    date: tomorrow.toISOString().slice(0, 10),
    heure: "09:00",
  });
}
