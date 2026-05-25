/** Schémas Zod pour les tags (création rapide depuis la fiche prospect). */
import { z } from "zod";

export const tagSchema = z.object({
  label: z
    .string({ required_error: "Le libellé est obligatoire" })
    .trim()
    .min(1, "Le libellé est obligatoire")
    .max(30, "Le libellé ne peut pas dépasser 30 caractères"),
  couleur: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "La couleur doit être au format #RRGGBB")
    .default("#10b981"),
});

export type TagFormValues = z.infer<typeof tagSchema>;
