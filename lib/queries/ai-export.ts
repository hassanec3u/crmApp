/**
 * Requête d'export des prospects actifs pour l'analyse IA (n8n).
 *
 * Regroupe par agent pour permettre au cron quotidien de traiter tout le
 * monde en un seul appel, ou de scoper à un agent pour le refresh manuel.
 */
import { STATUTS_FINAUX } from "@/lib/constants/statuts";
import { prisma } from "@/lib/prisma";

export interface ExportedProspect {
  id: string;
  nom: string;
  prenom: string | null;
  statut: string | null;
  criteres: unknown;
  notes: string | null;
  tags: string[];
  tachesOuvertes: Array<{
    titre: string;
    type: string;
    date: string;
    heure: string | null;
  }>;
  historiqueRecent: Array<{ type: string; contenu: string | null; date: string }>;
  derniereActivite: string;
}

export interface ExportedUserProspects {
  userId: string;
  prospects: ExportedProspect[];
}

export async function getProspectsActifsPourExport(
  userId?: string,
): Promise<ExportedUserProspects[]> {
  const prospects = await prisma.prospect.findMany({
    where: {
      ...(userId ? { userId } : {}),
      statut: {
        NOT: { label: { in: STATUTS_FINAUX, mode: "insensitive" } },
      },
    },
    select: {
      id: true,
      nom: true,
      prenom: true,
      userId: true,
      criteres: true,
      notes: true,
      updatedAt: true,
      statut: { select: { label: true } },
      tags: { select: { label: true } },
      tasks: {
        where: { fait: false },
        select: { titre: true, type: true, date: true, heure: true },
        orderBy: { date: "asc" },
      },
      historiques: {
        select: { type: true, contenu: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  const byUser = new Map<string, ExportedProspect[]>();

  for (const p of prospects) {
    const derniereActivite = (p.historiques[0]?.createdAt ?? p.updatedAt).toISOString();

    const exported: ExportedProspect = {
      id: p.id,
      nom: p.nom,
      prenom: p.prenom,
      statut: p.statut?.label ?? null,
      criteres: p.criteres,
      notes: p.notes,
      tags: p.tags.map((t) => t.label),
      tachesOuvertes: p.tasks.map((t) => ({
        titre: t.titre,
        type: t.type,
        date: t.date.toISOString(),
        heure: t.heure,
      })),
      historiqueRecent: p.historiques.map((h) => ({
        type: h.type,
        contenu: h.contenu,
        date: h.createdAt.toISOString(),
      })),
      derniereActivite,
    };

    const list = byUser.get(p.userId) ?? [];
    list.push(exported);
    byUser.set(p.userId, list);
  }

  return Array.from(byUser.entries()).map(([uid, list]) => ({
    userId: uid,
    prospects: list,
  }));
}
