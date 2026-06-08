import type { Session } from "next-auth";

import type { TaskScope } from "@/lib/constants/tasks";
import { prisma } from "@/lib/prisma";

export function canViewAllTasks(role: string | undefined): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

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
