/** Schémas Zod pour la gestion des statuts (pipeline). */
import { z } from "zod";

/** Regex couleur hexadécimale stricte (#RRGGBB). */
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const statutSchema = z.object({
  label: z
    .string({ required_error: "Le libellé est obligatoire" })
    .trim()
    .min(1, "Le libellé est obligatoire")
    .max(50, "Le libellé ne peut pas dépasser 50 caractères"),
  couleur: z
    .string()
    .regex(HEX_COLOR, "La couleur doit être au format #RRGGBB"),
});

export const statutUpdateSchema = statutSchema.extend({
  id: z.string().cuid(),
});

/** Réordonnancement complet : tableau d'IDs dans l'ordre voulu. */
export const statutReorderSchema = z.object({
  orderedIds: z.array(z.string().cuid()).min(1),
});

export type StatutFormValues = z.infer<typeof statutSchema>;
export type StatutUpdateValues = z.infer<typeof statutUpdateSchema>;
