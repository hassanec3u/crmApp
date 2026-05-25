/** Server Actions — création / suppression rapide de tags. */
"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { tagSchema, type TagFormValues } from "@/lib/validators/tag";

import type { ActionResult } from "@/lib/actions/prospects";

export async function createTag(
  input: TagFormValues,
): Promise<ActionResult<{ id: string; label: string; couleur: string }>> {
  const session = await requireSession();
  const parsed = tagSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation échouée",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  try {
    const tag = await prisma.tag.upsert({
      where: {
        userId_label: {
          userId: session.user.id,
          label: parsed.data.label,
        },
      },
      update: { couleur: parsed.data.couleur },
      create: {
        label: parsed.data.label,
        couleur: parsed.data.couleur,
        userId: session.user.id,
      },
    });

    revalidatePath("/prospects");
    return {
      ok: true,
      data: { id: tag.id, label: tag.label, couleur: tag.couleur },
    };
  } catch (error) {
    console.error("[createTag]", error);
    return { ok: false, error: "Impossible de créer le tag" };
  }
}

export async function deleteTag(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const existing = await prisma.tag.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Tag introuvable" };

  try {
    await prisma.tag.delete({ where: { id: existing.id } });
    revalidatePath("/prospects");
    return { ok: true, data: { id: existing.id } };
  } catch (error) {
    console.error("[deleteTag]", error);
    return { ok: false, error: "Impossible de supprimer le tag" };
  }
}
