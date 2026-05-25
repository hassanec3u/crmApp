/**
 * Server Actions — gestion des statuts (page /parametres/statuts).
 *
 * Tous les statuts sont scoppés à l'utilisateur courant (`userId`).
 * Le réordonnancement utilise une transaction Prisma pour rester
 * cohérent même en cas d'erreur partielle.
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  statutReorderSchema,
  statutSchema,
  statutUpdateSchema,
  type StatutFormValues,
  type StatutUpdateValues,
} from "@/lib/validators/statut";

import type { ActionResult } from "@/lib/actions/prospects";

function zodToError<T>(error: z.ZodError): ActionResult<T> {
  return {
    ok: false,
    error: "Validation échouée",
    fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
  };
}

// =====================================================================
// Création
// =====================================================================
export async function createStatut(
  input: StatutFormValues,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = statutSchema.safeParse(input);
  if (!parsed.success) return zodToError(parsed.error);

  try {
    // Détermine le prochain `ordre` en queue de liste
    const last = await prisma.statut.findFirst({
      where: { userId: session.user.id },
      orderBy: { ordre: "desc" },
      select: { ordre: true },
    });

    const created = await prisma.statut.create({
      data: {
        label: parsed.data.label,
        couleur: parsed.data.couleur,
        ordre: (last?.ordre ?? -1) + 1,
        userId: session.user.id,
      },
    });

    revalidatePath("/parametres/statuts");
    revalidatePath("/prospects");
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { ok: false, error: "Un statut avec ce libellé existe déjà" };
    }
    console.error("[createStatut]", error);
    return { ok: false, error: "Impossible de créer le statut" };
  }
}

// =====================================================================
// Mise à jour
// =====================================================================
export async function updateStatut(
  input: StatutUpdateValues,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = statutUpdateSchema.safeParse(input);
  if (!parsed.success) return zodToError(parsed.error);

  const existing = await prisma.statut.findFirst({
    where: { id: parsed.data.id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Statut introuvable" };

  try {
    await prisma.statut.update({
      where: { id: existing.id },
      data: { label: parsed.data.label, couleur: parsed.data.couleur },
    });
    revalidatePath("/parametres/statuts");
    revalidatePath("/prospects");
    return { ok: true, data: { id: existing.id } };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { ok: false, error: "Un statut avec ce libellé existe déjà" };
    }
    console.error("[updateStatut]", error);
    return { ok: false, error: "Impossible de mettre à jour le statut" };
  }
}

// =====================================================================
// Suppression (les prospects rattachés voient leur statutId → null
// grâce à `onDelete: SetNull` dans le schéma Prisma).
// =====================================================================
export async function deleteStatut(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();

  const existing = await prisma.statut.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Statut introuvable" };

  try {
    await prisma.statut.delete({ where: { id: existing.id } });
    revalidatePath("/parametres/statuts");
    revalidatePath("/prospects");
    return { ok: true, data: { id: existing.id } };
  } catch (error) {
    console.error("[deleteStatut]", error);
    return { ok: false, error: "Impossible de supprimer le statut" };
  }
}

// =====================================================================
// Réordonnancement (drag & drop)
// =====================================================================
export async function reorderStatuts(
  input: z.infer<typeof statutReorderSchema>,
): Promise<ActionResult<{ count: number }>> {
  const session = await requireSession();
  const parsed = statutReorderSchema.safeParse(input);
  if (!parsed.success) return zodToError(parsed.error);

  // Vérifie que tous les IDs appartiennent bien à l'utilisateur courant
  const owned = await prisma.statut.findMany({
    where: { userId: session.user.id, id: { in: parsed.data.orderedIds } },
    select: { id: true },
  });
  if (owned.length !== parsed.data.orderedIds.length) {
    return { ok: false, error: "Certains statuts sont introuvables" };
  }

  try {
    await prisma.$transaction(
      parsed.data.orderedIds.map((id, index) =>
        prisma.statut.update({
          where: { id },
          data: { ordre: index },
        }),
      ),
    );
    revalidatePath("/parametres/statuts");
    revalidatePath("/prospects");
    return { ok: true, data: { count: parsed.data.orderedIds.length } };
  } catch (error) {
    console.error("[reorderStatuts]", error);
    return { ok: false, error: "Impossible de réordonner les statuts" };
  }
}
