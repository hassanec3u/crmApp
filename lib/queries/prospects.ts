/**
 * Requêtes serveur (read-only) pour les prospects.
 *
 * Importable uniquement depuis des composants serveur et server actions.
 */
import { type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { PROSPECTS_PAGE_SIZE, type ProspectSort } from "@/lib/constants";

// =====================================================================
// Types de retour
// =====================================================================
export interface ProspectListItem {
  id: string;
  nom: string;
  prenom: string | null;
  telephone: string | null;
  email: string | null;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
  statut: { id: string; label: string; couleur: string } | null;
  tags: { id: string; label: string; couleur: string }[];
  _count: { historiques: number };
  lastAction: { createdAt: Date; type: string; contenu: string | null } | null;
}

export interface ProspectListResult {
  items: ProspectListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ProspectListParams {
  userId: string;
  search?: string;
  statutId?: string;
  tagId?: string;
  source?: string;
  sort?: ProspectSort;
  page?: number;
}

// =====================================================================
// Liste paginée avec filtres
// =====================================================================
export async function getProspects(
  params: ProspectListParams,
): Promise<ProspectListResult> {
  const page = Math.max(params.page ?? 1, 1);
  const skip = (page - 1) * PROSPECTS_PAGE_SIZE;

  const where: Prisma.ProspectWhereInput = {
    userId: params.userId,
  };

  // Recherche texte libre (nom, prénom, téléphone, email)
  if (params.search && params.search.trim().length > 0) {
    const term = params.search.trim();
    where.OR = [
      { nom: { contains: term, mode: "insensitive" } },
      { prenom: { contains: term, mode: "insensitive" } },
      { telephone: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
    ];
  }

  if (params.statutId) {
    where.statutId = params.statutId;
  }
  if (params.tagId) {
    where.tags = { some: { id: params.tagId } };
  }
  if (params.source) {
    where.source = params.source;
  }

  // Tri
  let orderBy: Prisma.ProspectOrderByWithRelationInput = { createdAt: "desc" };
  if (params.sort) {
    const [field, dir] = params.sort.split("-") as [string, "asc" | "desc"];
    orderBy = { [field]: dir };
  }

  const [items, total] = await Promise.all([
    prisma.prospect.findMany({
      where,
      orderBy,
      skip,
      take: PROSPECTS_PAGE_SIZE,
      select: {
        id: true,
        nom: true,
        prenom: true,
        telephone: true,
        email: true,
        source: true,
        createdAt: true,
        updatedAt: true,
        statut: { select: { id: true, label: true, couleur: true } },
        tags: { select: { id: true, label: true, couleur: true } },
        _count: { select: { historiques: true } },
        historiques: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true, type: true, contenu: true },
        },
      },
    }),
    prisma.prospect.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      lastAction: item.historiques[0] ?? null,
    })),
    total,
    page,
    totalPages: Math.max(Math.ceil(total / PROSPECTS_PAGE_SIZE), 1),
  };
}

// =====================================================================
// Fiche complète d'un prospect
// =====================================================================
export async function getProspectById(id: string, userId: string) {
  return prisma.prospect.findFirst({
    where: { id, userId },
    include: {
      statut: true,
      tags: { orderBy: { label: "asc" } },
      tasks: {
        orderBy: [{ fait: "asc" }, { date: "asc" }],
      },
      historiques: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });
}

// =====================================================================
// Listes courtes pour les filtres / selects
// =====================================================================
export async function getUserStatuts(userId: string) {
  return prisma.statut.findMany({
    where: { userId },
    orderBy: { ordre: "asc" },
    select: { id: true, label: true, couleur: true, ordre: true },
  });
}

export async function getUserTags(userId: string) {
  return prisma.tag.findMany({
    where: { userId },
    orderBy: { label: "asc" },
    select: { id: true, label: true, couleur: true },
  });
}

/** Nombre total de prospects appartenant à l'utilisateur. */
export async function countAllProspectsForUser(userId: string): Promise<number> {
  return prisma.prospect.count({ where: { userId } });
}
