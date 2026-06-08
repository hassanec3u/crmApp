/**
 * Règles d'accès aux tâches/rappels et aux prospects associés.
 *
 * Un agent ne voit que ses propres tâches/prospects ; un admin ou un
 * manager peut voir et gérer ceux de toute l'équipe (`canViewAllTasks`).
 */
import type { Session } from "next-auth";

import type { TaskScope } from "@/lib/constants/tasks";
import { prisma } from "@/lib/prisma";

/** Vrai si le rôle donne une visibilité sur les tâches de toute l'équipe. */
export function canViewAllTasks(role: string | undefined): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

/** Détermine la portée effective à appliquer (retombe sur "mine" si non autorisé). */
export function resolveTaskScope(
  scope: string | undefined,
  role: string | undefined,
): TaskScope {
  if (scope === "all" && canViewAllTasks(role)) return "all";
  return "mine";
}

/** Filtre Prisma sur les tâches selon le périmètre. */
export function buildTaskAssigneeFilter(
  userId: string,
  scope: TaskScope,
  role: string | undefined,
): { assignedUserId?: string } {
  if (scope === "all" && canViewAllTasks(role)) {
    return {};
  }
  return { assignedUserId: userId };
}

/** Récupère un prospect uniquement s'il est accessible à l'utilisateur courant. */
export async function findAccessibleProspect(
  prospectId: string,
  session: Session,
): Promise<{ id: string; nom: string; prenom: string | null } | null> {
  return prisma.prospect.findFirst({
    where: {
      id: prospectId,
      ...(canViewAllTasks(session.user.role)
        ? {}
        : { userId: session.user.id }),
    },
    select: { id: true, nom: true, prenom: true },
  });
}

/** Récupère une tâche si elle est assignée à l'utilisateur, ou s'il a une vision globale. */
export async function findAccessibleTask(
  taskId: string,
  session: Session,
): Promise<{
  id: string;
  fait: boolean;
  prospectId: string;
  titre: string;
  date: Date;
  assignedUserId: string;
} | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      fait: true,
      prospectId: true,
      titre: true,
      date: true,
      assignedUserId: true,
    },
  });

  if (!task) return null;
  if (task.assignedUserId === session.user.id) return task;
  if (canViewAllTasks(session.user.role)) return task;
  return null;
}

/**
 * Valide le destinataire demandé pour une tâche.
 *
 * Par défaut, une tâche est assignée à son créateur. Réassigner à un
 * autre collaborateur n'est permis qu'aux rôles avec vision globale,
 * et seulement vers un utilisateur existant.
 */
export async function resolveAssigneeId(
  requestedId: string | undefined,
  session: Session,
): Promise<string | null> {
  const defaultId = session.user.id;
  if (!requestedId || requestedId === defaultId) return defaultId;

  if (!canViewAllTasks(session.user.role)) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: requestedId },
    select: { id: true },
  });
  return user?.id ?? null;
}
