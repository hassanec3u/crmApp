/**
 * Requête dashboard : top 10 des priorités IA pour l'agent connecté,
 * triées Chaud → Tiède → Froid puis par date de calcul décroissante.
 */
import { PriorityScore } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export interface PrioriteIA {
  id: string;
  prospectId: string;
  prospectNom: string;
  prospectPrenom: string | null;
  score: PriorityScore;
  raison: string;
  computedAt: Date;
}

const SCORE_ORDER: Record<PriorityScore, number> = {
  [PriorityScore.CHAUD]: 0,
  [PriorityScore.TIEDE]: 1,
  [PriorityScore.FROID]: 2,
};

export async function getPrioritesIA(userId: string): Promise<PrioriteIA[]> {
  const rows = await prisma.prospectPriority.findMany({
    where: { prospect: { userId } },
    select: {
      id: true,
      score: true,
      raison: true,
      computedAt: true,
      prospect: { select: { id: true, nom: true, prenom: true } },
    },
    orderBy: { computedAt: "desc" },
    take: 50,
  });

  return rows
    .map((r) => ({
      id: r.id,
      prospectId: r.prospect.id,
      prospectNom: r.prospect.nom,
      prospectPrenom: r.prospect.prenom,
      score: r.score,
      raison: r.raison,
      computedAt: r.computedAt,
    }))
    .sort((a, b) => SCORE_ORDER[a.score] - SCORE_ORDER[b.score])
    .slice(0, 10);
}
