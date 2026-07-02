/**
 * Libellés de statuts considérés comme "finaux" (dossier clos).
 *
 * Comparaison insensible à la casse — utilisé pour exclure ces prospects
 * des relances automatiques, des compteurs "actifs" et de l'export IA.
 */
export const STATUTS_FINAUX = ["vendu", "clôturé", "cloturé", "faux numéro"];
