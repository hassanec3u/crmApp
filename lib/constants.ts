/**
 * Constantes métier partagées.
 *
 * Centralise les listes utilisées par les formulaires et les filtres
 * (sources de leads, palette de couleurs des statuts/tags, types de
 * bien, etc.) afin d'éviter les chaînes magiques éparpillées.
 */

import type { BienType, TransactionType } from "@/types/prospect";

/** Sources possibles d'un lead (liste fermée présentée dans le formulaire). */
export const PROSPECT_SOURCES = [
  "Figaro",
  "Bouche à oreille",
  "Site web",
  "Autre",
] as const;
export type ProspectSource = (typeof PROSPECT_SOURCES)[number];

/** Types de bien immobilier reconnus. */
export const BIEN_TYPES: { value: BienType; label: string }[] = [
  { value: "appartement", label: "Appartement" },
  { value: "maison", label: "Maison" },
  { value: "terrain", label: "Terrain" },
  { value: "local", label: "Local / Commerce" },
  { value: "immeuble", label: "Immeuble" },
];

/** Types de transaction. */
export const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: "achat", label: "Achat" },
  { value: "location", label: "Location" },
  { value: "investissement", label: "Investissement" },
];

/**
 * Palette de couleurs présélectionnées pour les statuts et les tags.
 * Compatible Tailwind (Tailwind v3 palette par défaut).
 */
export const COLOR_PALETTE: { name: string; value: string }[] = [
  { name: "Rouge", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Ambre", value: "#f59e0b" },
  { name: "Jaune", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Vert", value: "#10b981" },
  { name: "Émeraude", value: "#059669" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Ciel", value: "#0ea5e9" },
  { name: "Bleu", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Pourpre", value: "#a855f7" },
  { name: "Rose", value: "#ec4899" },
  { name: "Gris", value: "#6b7280" },
  { name: "Ardoise", value: "#475569" },
  { name: "Noir", value: "#111827" },
];

/** Taille de page utilisée par défaut pour la liste des prospects. */
export const PROSPECTS_PAGE_SIZE = 20;

/** Options de tri exposées dans la liste de prospects. */
export const PROSPECT_SORT_OPTIONS = [
  { value: "createdAt-desc", label: "Date de création (+ récent)" },
  { value: "createdAt-asc", label: "Date de création (+ ancien)" },
  { value: "updatedAt-desc", label: "Dernière activité (+ récent)" },
  { value: "updatedAt-asc", label: "Dernière activité (+ ancien)" },
  { value: "nom-asc", label: "Nom (A → Z)" },
  { value: "nom-desc", label: "Nom (Z → A)" },
] as const;
export type ProspectSort = (typeof PROSPECT_SORT_OPTIONS)[number]["value"];
