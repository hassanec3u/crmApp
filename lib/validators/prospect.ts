/**
 * Schémas Zod pour les prospects.
 *
 * Sert à valider :
 *   - les données du formulaire de création / édition (côté client)
 *   - le payload reçu par les Server Actions (défense en profondeur)
 *
 * Les champs `criteres.*` sont tous optionnels — on stocke ensuite le
 * tout dans la colonne JSON `Prospect.criteres`.
 */
import { z } from "zod";

import { PROSPECT_SOURCES } from "@/lib/constants";

/** Schéma des critères immobiliers (stockés en JSON côté Prisma). */
export const criteresSchema = z
  .object({
    transaction: z.enum(["achat", "location", "investissement"]).optional(),
    type: z
      .enum(["appartement", "maison", "terrain", "local", "immeuble"])
      .optional(),
    budgetMin: z
      .number({ invalid_type_error: "Budget min invalide" })
      .int()
      .nonnegative()
      .optional(),
    budgetMax: z
      .number({ invalid_type_error: "Budget max invalide" })
      .int()
      .nonnegative()
      .optional(),
    surfaceMin: z.number().int().nonnegative().optional(),
    surfaceMax: z.number().int().nonnegative().optional(),
    pieces: z.number().int().nonnegative().optional(),
    chambres: z.number().int().nonnegative().optional(),
    villes: z.array(z.string().min(1)).optional(),
    etageMin: z.number().int().optional(),
    exterieur: z.boolean().optional(),
    parking: z.boolean().optional(),
    remarques: z.string().max(1000).optional(),
  })
  .refine(
    (data) =>
      data.budgetMin === undefined ||
      data.budgetMax === undefined ||
      data.budgetMin <= data.budgetMax,
    {
      message: "Le budget minimum doit être inférieur ou égal au budget maximum",
      path: ["budgetMax"],
    },
  );

/**
 * Schéma de base d'un prospect.
 * Utilisé tel quel pour la création, étendu pour l'édition (avec un id).
 */
export const prospectSchema = z.object({
  nom: z
    .string({ required_error: "Le nom est obligatoire" })
    .trim()
    .min(1, "Le nom est obligatoire")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  prenom: z
    .string()
    .trim()
    .max(100, "Le prénom ne peut pas dépasser 100 caractères")
    .optional()
    .or(z.literal("")),
  telephone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Email invalide")
    .max(150)
    .optional()
    .or(z.literal("")),
  source: z.enum(PROSPECT_SOURCES).optional().or(z.literal("")),
  statutId: z.string().cuid().optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
  tagIds: z.array(z.string().cuid()).optional().default([]),
  criteres: criteresSchema.optional(),
});

/** Schéma de mise à jour : id obligatoire en plus. */
export const prospectUpdateSchema = prospectSchema.extend({
  id: z.string().cuid(),
});

export type ProspectFormValues = z.infer<typeof prospectSchema>;
export type ProspectUpdateValues = z.infer<typeof prospectUpdateSchema>;
export type CriteresValues = z.infer<typeof criteresSchema>;
