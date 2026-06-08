import type { TaskType } from "@prisma/client";

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  RAPPEL: "Rappel",
  RELANCE: "Relance",
  RDV: "Rendez-vous",
  VERIFICATION: "Vérification",
  SUIVI: "Suivi",
};

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

export type TaskScope = "mine" | "all";

export const RDV_TASK_TYPES: TaskType[] = ["RDV"];
