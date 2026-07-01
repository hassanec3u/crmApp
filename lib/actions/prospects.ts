/**
 * Server Actions — Prospects.
 *
 * Toutes les mutations passent par ces fonctions :
 *   - création, mise à jour, suppression d'un prospect
 *   - changement de statut (avec historique)
 *   - ajout d'une note (avec historique)
 *   - ajout / suppression de tag (avec historique)
 *
 * Conventions :
 *   - Chaque action retourne `{ ok: true, data }` ou `{ ok: false, error }`.
 *   - Les pages liste / fiche sont revalidées via `revalidatePath`.
 *   - L'utilisateur courant est imposé via `requireSession()` pour
 *     éviter toute fuite cross-utilisateur.
 */
"use server";

import { HistoriqueType, Prisma, TaskType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { notifyGcal } from "@/lib/gcal/notify";
import { requireSession } from "@/lib/session";
import {
  prospectSchema,
  prospectUpdateSchema,
  type ProspectFormValues,
  type ProspectUpdateValues,
} from "@/lib/validators/prospect";

// =====================================================================
// Types de retour standardisés
// =====================================================================
export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

// =====================================================================
// Helpers internes
// =====================================================================

/** Convertit une chaîne vide en `null` (pour Prisma). */
function emptyToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Sérialise les critères en JSON Prisma-compatible. */
function serializeCriteres(
  criteres: ProspectFormValues["criteres"],
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!criteres) return Prisma.JsonNull;
  const cleaned = Object.fromEntries(
    Object.entries(criteres).filter(([, v]) => {
      if (v === undefined) return false;
      if (typeof v === "string" && v.trim() === "") return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    }),
  );
  return Object.keys(cleaned).length > 0
    ? (cleaned as Prisma.InputJsonValue)
    : Prisma.JsonNull;
}

/** Wrappe une erreur Zod en `ActionResult` lisible. */
function zodToError<T>(error: z.ZodError): ActionResult<T> {
  return {
    ok: false,
    error: "Validation échouée",
    fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
  };
}

// =====================================================================
// Création d'un prospect
// =====================================================================
export async function createProspect(
  input: ProspectFormValues,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = prospectSchema.safeParse(input);
  if (!parsed.success) return zodToError(parsed.error);

  try {
    const data = parsed.data;
    const created = await prisma.prospect.create({
      data: {
        nom: data.nom.trim(),
        prenom: emptyToNull(data.prenom),
        telephone: emptyToNull(data.telephone),
        email: emptyToNull(data.email),
        source: emptyToNull(data.source),
        statutId: emptyToNull(data.statutId),
        notes: emptyToNull(data.notes),
        criteres: serializeCriteres(data.criteres),
        userId: session.user.id,
        tags:
          data.tagIds && data.tagIds.length > 0
            ? { connect: data.tagIds.map((id) => ({ id })) }
            : undefined,
      },
    });

    // Historique : création initiale du prospect
    await prisma.historiqueAction.create({
      data: {
        type: HistoriqueType.OTHER,
        contenu: "Création du prospect",
        prospectId: created.id,
        userId: session.user.id,
      },
    });

    revalidatePath("/prospects");
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    console.error("[createProspect]", error);
    return { ok: false, error: "Impossible de créer le prospect" };
  }
}

// =====================================================================
// Mise à jour d'un prospect (formulaire d'édition complet)
// =====================================================================
export async function updateProspect(
  input: ProspectUpdateValues,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = prospectUpdateSchema.safeParse(input);
  if (!parsed.success) return zodToError(parsed.error);

  const data = parsed.data;
  const existing = await prisma.prospect.findFirst({
    where: { id: data.id, userId: session.user.id },
    select: { id: true, statutId: true },
  });
  if (!existing) return { ok: false, error: "Prospect introuvable" };

  try {
    await prisma.prospect.update({
      where: { id: existing.id },
      data: {
        nom: data.nom.trim(),
        prenom: emptyToNull(data.prenom),
        telephone: emptyToNull(data.telephone),
        email: emptyToNull(data.email),
        source: emptyToNull(data.source),
        statutId: emptyToNull(data.statutId),
        notes: emptyToNull(data.notes),
        criteres: serializeCriteres(data.criteres),
        tags: {
          set: (data.tagIds ?? []).map((id) => ({ id })),
        },
      },
    });

    // Si le statut a changé via le formulaire, on trace.
    const newStatutId = emptyToNull(data.statutId);
    if (existing.statutId !== newStatutId) {
      await prisma.historiqueAction.create({
        data: {
          type: HistoriqueType.STATUS_CHANGE,
          contenu: "Statut modifié depuis le formulaire d'édition",
          prospectId: existing.id,
          userId: session.user.id,
        },
      });
    }

    revalidatePath("/prospects");
    revalidatePath(`/prospects/${existing.id}`);
    return { ok: true, data: { id: existing.id } };
  } catch (error) {
    console.error("[updateProspect]", error);
    return { ok: false, error: "Impossible de mettre à jour le prospect" };
  }
}

// =====================================================================
// Suppression d'un prospect
// =====================================================================
export async function deleteProspect(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const existing = await prisma.prospect.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Prospect introuvable" };

  try {
    await prisma.prospect.delete({ where: { id: existing.id } });
    revalidatePath("/prospects");
    return { ok: true, data: { id: existing.id } };
  } catch (error) {
    console.error("[deleteProspect]", error);
    return { ok: false, error: "Impossible de supprimer le prospect" };
  }
}

// =====================================================================
// Changement de statut (action rapide depuis la fiche)
// =====================================================================
const changeStatutSchema = z.object({
  prospectId: z.string().cuid(),
  statutId: z.string().cuid().nullable(),
});

export async function changeProspectStatut(
  input: z.infer<typeof changeStatutSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = changeStatutSchema.safeParse(input);
  if (!parsed.success) return zodToError(parsed.error);

  const prospect = await prisma.prospect.findFirst({
    where: { id: parsed.data.prospectId, userId: session.user.id },
    include: { statut: true },
  });
  if (!prospect) return { ok: false, error: "Prospect introuvable" };

  // Récupère le libellé du nouveau statut pour l'historique
  let nouveauLabel = "aucun";
  if (parsed.data.statutId) {
    const statut = await prisma.statut.findUnique({
      where: { id: parsed.data.statutId },
      select: { label: true },
    });
    if (!statut) return { ok: false, error: "Statut introuvable" };
    nouveauLabel = statut.label;
  }

  try {
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { statutId: parsed.data.statutId },
    });

    await prisma.historiqueAction.create({
      data: {
        type: HistoriqueType.STATUS_CHANGE,
        contenu: `Statut : ${prospect.statut?.label ?? "aucun"} → ${nouveauLabel}`,
        prospectId: prospect.id,
        userId: session.user.id,
      },
    });

    revalidatePath("/prospects");
    revalidatePath(`/prospects/${prospect.id}`);
    return { ok: true, data: { id: prospect.id } };
  } catch (error) {
    console.error("[changeProspectStatut]", error);
    return { ok: false, error: "Impossible de changer le statut" };
  }
}

// =====================================================================
// Ajout d'une note (depuis la fiche prospect)
// =====================================================================
const addNoteSchema = z.object({
  prospectId: z.string().cuid(),
  contenu: z.string().trim().min(1, "La note ne peut pas être vide").max(2000),
});

export async function addProspectNote(
  input: z.infer<typeof addNoteSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = addNoteSchema.safeParse(input);
  if (!parsed.success) return zodToError(parsed.error);

  const prospect = await prisma.prospect.findFirst({
    where: { id: parsed.data.prospectId, userId: session.user.id },
    select: { id: true },
  });
  if (!prospect) return { ok: false, error: "Prospect introuvable" };

  try {
    const created = await prisma.historiqueAction.create({
      data: {
        type: HistoriqueType.NOTE,
        contenu: parsed.data.contenu,
        prospectId: prospect.id,
        userId: session.user.id,
      },
    });

    revalidatePath(`/prospects/${prospect.id}`);
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    console.error("[addProspectNote]", error);
    return { ok: false, error: "Impossible d'ajouter la note" };
  }
}

// =====================================================================
// Mise à jour libre du champ `notes` du prospect (notes internes)
// =====================================================================
const updateNotesSchema = z.object({
  prospectId: z.string().cuid(),
  notes: z.string().max(5000),
});

export async function updateProspectNotes(
  input: z.infer<typeof updateNotesSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = updateNotesSchema.safeParse(input);
  if (!parsed.success) return zodToError(parsed.error);

  const prospect = await prisma.prospect.findFirst({
    where: { id: parsed.data.prospectId, userId: session.user.id },
    select: { id: true },
  });
  if (!prospect) return { ok: false, error: "Prospect introuvable" };

  try {
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { notes: emptyToNull(parsed.data.notes) },
    });
    revalidatePath(`/prospects/${prospect.id}`);
    return { ok: true, data: { id: prospect.id } };
  } catch (error) {
    console.error("[updateProspectNotes]", error);
    return { ok: false, error: "Impossible de mettre à jour les notes" };
  }
}

// =====================================================================
// Ajout d'un tag à un prospect
// =====================================================================
const tagOnProspectSchema = z.object({
  prospectId: z.string().cuid(),
  tagId: z.string().cuid(),
});

export async function addTagToProspect(
  input: z.infer<typeof tagOnProspectSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = tagOnProspectSchema.safeParse(input);
  if (!parsed.success) return zodToError(parsed.error);

  const [prospect, tag] = await Promise.all([
    prisma.prospect.findFirst({
      where: { id: parsed.data.prospectId, userId: session.user.id },
      select: { id: true },
    }),
    prisma.tag.findFirst({
      where: { id: parsed.data.tagId, userId: session.user.id },
      select: { id: true, label: true },
    }),
  ]);
  if (!prospect) return { ok: false, error: "Prospect introuvable" };
  if (!tag) return { ok: false, error: "Tag introuvable" };

  try {
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { tags: { connect: { id: tag.id } } },
    });
    await prisma.historiqueAction.create({
      data: {
        type: HistoriqueType.TAG_ADDED,
        contenu: `Tag ajouté : ${tag.label}`,
        prospectId: prospect.id,
        userId: session.user.id,
      },
    });
    revalidatePath(`/prospects/${prospect.id}`);
    return { ok: true, data: { id: prospect.id } };
  } catch (error) {
    console.error("[addTagToProspect]", error);
    return { ok: false, error: "Impossible d'ajouter le tag" };
  }
}

export async function removeTagFromProspect(
  input: z.infer<typeof tagOnProspectSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = tagOnProspectSchema.safeParse(input);
  if (!parsed.success) return zodToError(parsed.error);

  const [prospect, tag] = await Promise.all([
    prisma.prospect.findFirst({
      where: { id: parsed.data.prospectId, userId: session.user.id },
      select: { id: true },
    }),
    prisma.tag.findFirst({
      where: { id: parsed.data.tagId, userId: session.user.id },
      select: { id: true, label: true },
    }),
  ]);
  if (!prospect) return { ok: false, error: "Prospect introuvable" };
  if (!tag) return { ok: false, error: "Tag introuvable" };

  try {
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { tags: { disconnect: { id: tag.id } } },
    });
    await prisma.historiqueAction.create({
      data: {
        type: HistoriqueType.TAG_REMOVED,
        contenu: `Tag retiré : ${tag.label}`,
        prospectId: prospect.id,
        userId: session.user.id,
      },
    });
    revalidatePath(`/prospects/${prospect.id}`);
    return { ok: true, data: { id: prospect.id } };
  } catch (error) {
    console.error("[removeTagFromProspect]", error);
    return { ok: false, error: "Impossible de retirer le tag" };
  }
}

// =====================================================================
// Suppression en masse de tous les prospects de l'utilisateur
// =====================================================================

/**
 * Supprime définitivement tous les prospects de l'utilisateur courant.
 *
 * Cascade Prisma : les tâches et l'historique liés sont supprimés
 * automatiquement (`onDelete: Cascade` dans le schéma). Comme cette
 * cascade ne déclenche aucun code applicatif, on notifie n8n pour
 * chaque RDV synchronisé avant la suppression.
 */
export async function deleteAllMyProspects(): Promise<ActionResult<{ count: number }>> {
  const session = await requireSession();

  try {
    const rdvTasks = await prisma.task.findMany({
      where: {
        prospect: { userId: session.user.id },
        type: TaskType.RDV,
        googleCalendarEventId: { not: null },
      },
      select: { id: true, googleCalendarEventId: true },
    });

    for (const task of rdvTasks) {
      notifyGcal({
        action: "delete",
        taskId: task.id,
        googleCalendarEventId: task.googleCalendarEventId,
      });
    }

    const { count } = await prisma.prospect.deleteMany({
      where: { userId: session.user.id },
    });

    revalidatePath("/prospects");
    revalidatePath("/prospects/[id]", "page");
    revalidatePath("/taches");
    revalidatePath("/agenda");
    revalidatePath("/dashboard");
    return { ok: true, data: { count } };
  } catch (error) {
    console.error("[deleteAllMyProspects]", error);
    return { ok: false, error: "Impossible de supprimer les prospects" };
  }
}
