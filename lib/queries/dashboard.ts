/**
 * Requêtes serveur pour le dashboard commercial.
 *
 * Chaque fonction correspond à un widget du dashboard et retourne
 * uniquement les données nécessaires à l'affichage.
 */
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
} from "date-fns";

import { RDV_TASK_TYPES } from "@/lib/constants/tasks";
import { prisma } from "@/lib/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LeadDuJour {
  id: string;
  nom: string;
  prenom: string | null;
  source: string | null;
  createdAt: Date;
  statut: { label: string; couleur: string } | null;
}

export interface RappelDuJour {
  id: string;
  type: import("@prisma/client").TaskType;
  titre: string;
  heure: string | null;
  fait: boolean;
  date: Date;
  prospect: { id: string; nom: string; prenom: string | null };
  assignedUser: { id: string; name: string | null };
}

export interface TacheUrgente {
  id: string;
  type: import("@prisma/client").TaskType;
  titre: string;
  heure: string | null;
  date: Date;
  prospect: { id: string; nom: string; prenom: string | null };
  assignedUser: { id: string; name: string | null };
}

export interface RendezVous {
  id: string;
  titre: string;
  commentaire: string | null;
  date: Date;
  heure: string | null;
  prospect: { id: string; nom: string; prenom: string | null };
}

export interface ProspectARelancer {
  id: string;
  nom: string;
  prenom: string | null;
  statut: { label: string; couleur: string } | null;
  lastActivity: Date | null;
  joursSansContact: number;
}

export interface DashboardStats {
  prospectsActifs: number;
  leadsThisWeek: number;
  tachesEnRetard: number;
  rdvThisWeek: number;
}

// ─── Requêtes ────────────────────────────────────────────────────────────────

/**
 * Leads créés aujourd'hui pour l'utilisateur connecté.
 */
export async function getLeadsDuJour(userId: string): Promise<LeadDuJour[]> {
  const now = new Date();
  return prisma.prospect.findMany({
    where: {
      userId,
      createdAt: {
        gte: startOfDay(now),
        lte: endOfDay(now),
      },
    },
    select: {
      id: true,
      nom: true,
      prenom: true,
      source: true,
      createdAt: true,
      statut: { select: { label: true, couleur: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Tâches du jour (rappels programmés aujourd'hui).
 */
export async function getRappelsDuJour(
  userId: string,
): Promise<RappelDuJour[]> {
  const now = new Date();
  return prisma.task.findMany({
    where: {
      assignedUserId: userId,
      date: {
        gte: startOfDay(now),
        lte: endOfDay(now),
      },
    },
    select: {
      id: true,
      type: true,
      titre: true,
      heure: true,
      fait: true,
      date: true,
      prospect: { select: { id: true, nom: true, prenom: true } },
      assignedUser: { select: { id: true, name: true } },
    },
    orderBy: [{ heure: "asc" }, { createdAt: "asc" }],
  });
}

/**
 * Tâches en retard : non faites et date passée.
 */
export async function getTachesUrgentes(
  userId: string,
): Promise<TacheUrgente[]> {
  const now = new Date();
  return prisma.task.findMany({
    where: {
      assignedUserId: userId,
      fait: false,
      date: {
        lt: startOfDay(now),
      },
    },
    select: {
      id: true,
      type: true,
      titre: true,
      heure: true,
      date: true,
      prospect: { select: { id: true, nom: true, prenom: true } },
      assignedUser: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
    take: 20,
  });
}

/**
 * Rendez-vous à venir dans les 7 prochains jours (type RDV).
 */
export async function getRendezVous(userId: string): Promise<RendezVous[]> {
  const now = new Date();
  const in7Days = addDays(now, 7);

  return prisma.task.findMany({
    where: {
      assignedUserId: userId,
      fait: false,
      type: { in: RDV_TASK_TYPES },
      date: {
        gte: startOfDay(now),
        lte: endOfDay(in7Days),
      },
    },
    select: {
      id: true,
      titre: true,
      commentaire: true,
      date: true,
      heure: true,
      prospect: { select: { id: true, nom: true, prenom: true } },
    },
    orderBy: [{ date: "asc" }, { heure: "asc" }],
    take: 10,
  });
}

/**
 * Prospects actifs sans activité depuis plus de 7 jours.
 * Exclut les statuts "Vendu", "Clôturé", "Faux numéro".
 */
export async function getProspectsARelancer(
  userId: string,
): Promise<ProspectARelancer[]> {
  const excludedStatuts = ["vendu", "clôturé", "cloturé", "faux numéro"];

  const prospects = await prisma.prospect.findMany({
    where: {
      userId,
      statut: {
        NOT: {
          label: { in: excludedStatuts, mode: "insensitive" },
        },
      },
    },
    select: {
      id: true,
      nom: true,
      prenom: true,
      statut: { select: { label: true, couleur: true } },
      historiques: {
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      updatedAt: true,
    },
  });

  const now = new Date();
  return prospects
    .map((p) => {
      const lastActivity = p.historiques[0]?.createdAt ?? p.updatedAt;
      const joursSansContact = Math.floor(
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        id: p.id,
        nom: p.nom,
        prenom: p.prenom,
        statut: p.statut,
        lastActivity,
        joursSansContact,
      };
    })
    .filter((p) => p.joursSansContact >= 7)
    .sort((a, b) => b.joursSansContact - a.joursSansContact)
    .slice(0, 15);
}

/**
 * Compteurs résumés pour la barre haute.
 */
export async function getDashboardStats(
  userId: string,
): Promise<DashboardStats> {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [prospectsActifs, leadsThisWeek, tachesEnRetard, rdvThisWeek] =
    await Promise.all([
      // Total prospects actifs (exclure vendu, clôturé, faux numéro)
      prisma.prospect.count({
        where: {
          userId,
          statut: {
            NOT: {
              label: {
                in: ["vendu", "clôturé", "cloturé", "faux numéro"],
                mode: "insensitive",
              },
            },
          },
        },
      }),
      // Leads cette semaine
      prisma.prospect.count({
        where: {
          userId,
          createdAt: { gte: weekStart, lte: weekEnd },
        },
      }),
      // Tâches en retard
      prisma.task.count({
        where: {
          assignedUserId: userId,
          fait: false,
          date: { lt: startOfDay(now) },
        },
      }),
      // RDV cette semaine
      prisma.task.count({
        where: {
          assignedUserId: userId,
          fait: false,
          type: { in: RDV_TASK_TYPES },
          date: { gte: weekStart, lte: weekEnd },
        },
      }),
    ]);

  return { prospectsActifs, leadsThisWeek, tachesEnRetard, rdvThisWeek };
}
