/**
 * Constantes liées aux tâches/rappels commerciaux.
 *
 * Centralise les libellés, modèles de titres et options de filtre pour
 * rester cohérent entre les formulaires, badges et listes de tâches.
 */
import type { TaskType } from "@prisma/client";

/** Libellé affichable (FR) pour chaque valeur de l'enum `TaskType`. */
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  RAPPEL: "Rappel",
  RELANCE: "Relance",
  RDV: "Rendez-vous",
  VERIFICATION: "Vérification",
  SUIVI: "Suivi",
};

/** Options `{ value, label }` dérivées de `TASK_TYPE_LABELS`, prêtes pour un `<Select>`. */
export const TASK_TYPE_OPTIONS = (
  Object.keys(TASK_TYPE_LABELS) as TaskType[]
).map((value) => ({
  value,
  label: TASK_TYPE_LABELS[value],
}));

/** Modèles de titre rapide (préfixe le nom du prospect si besoin). */
export const TASK_TITLE_TEMPLATES: Array<{
  type: TaskType;
  label: string;
  titre: string;
}> = [
  { type: "RAPPEL", label: "Rappeler", titre: "Rappeler" },
  {
    type: "VERIFICATION",
    label: "Accord bancaire",
    titre: "Vérifier accord bancaire",
  },
  {
    type: "RAPPEL",
    label: "Avant RDV",
    titre: "Rappeler avant rendez-vous",
  },
  {
    type: "RELANCE",
    label: "Après envoi biens",
    titre: "Relancer après envoi d'appartements",
  },
  {
    type: "VERIFICATION",
    label: "Signature",
    titre: "Vérifier si le client a signé",
  },
  { type: "SUIVI", label: "Retour client", titre: "Faire un retour au client" },
  { type: "RDV", label: "RDV visite", titre: "Rendez-vous visite" },
  { type: "RDV", label: "RDV visio", titre: "Rendez-vous visio" },
];

/** Portée d'affichage des tâches : les miennes uniquement, ou toute l'équipe. */
export type TaskScope = "mine" | "all";

/** Types de tâches considérés comme des rendez-vous (affichés dans l'agenda). */
export const RDV_TASK_TYPES: TaskType[] = ["RDV"];
