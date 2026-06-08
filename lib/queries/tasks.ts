/**
 * Requêtes serveur pour les pages Tâches et Agenda.
 */
import { TaskType } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";

import type { TaskScope } from "@/lib/constants/tasks";
import { RDV_TASK_TYPES } from "@/lib/constants/tasks";
import { prisma } from "@/lib/prisma";
import {
  buildTaskAssigneeFilter,
  canViewAllTasks,
} from "@/lib/tasks/access";

export type TaskTab = "today" | "overdue" | "upcoming" | "done";

export interface TaskListItem {
  id: string;
  type: TaskType;
  titre: string;
  commentaire: string | null;
  date: Date;
  heure: string | null;
  fait: boolean;
  prospect: { id: string; nom: string; prenom: string | null };
  assignedUser: { id: string; name: string | null };
}

const taskSelect = {
  id: true,
  type: true,
  titre: true,
  commentaire: true,
  date: true,
  heure: true,
  fait: true,
  prospect: { select: { id: true, nom: true, prenom: true } },
  assignedUser: { select: { id: true, name: true } },
} as const;

function assigneeWhere(
  userId: string,
  scope: TaskScope,
  role: string | undefined,
) {
  return buildTaskAssigneeFilter(userId, scope, role);
}

export async function getTasksForTab(
  userId: string,
  tab: TaskTab,
  scope: TaskScope,
  role: string | undefined,
): Promise<TaskListItem[]> {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const base = assigneeWhere(userId, scope, role);

  switch (tab) {
    case "today":
      return prisma.task.findMany({
        where: {
          ...base,
          fait: false,
          date: { gte: dayStart, lte: dayEnd },
        },
        select: taskSelect,
        orderBy: [{ heure: "asc" }, { createdAt: "asc" }],
      });
    case "overdue":
      return prisma.task.findMany({
        where: {
          ...base,
          fait: false,
          date: { lt: dayStart },
        },
        select: taskSelect,
        orderBy: { date: "asc" },
        take: 100,
      });
    case "upcoming":
      return prisma.task.findMany({
        where: {
          ...base,
          fait: false,
          date: { gt: dayEnd },
        },
        select: taskSelect,
        orderBy: [{ date: "asc" }, { heure: "asc" }],
        take: 100,
      });
    case "done":
      return prisma.task.findMany({
        where: { ...base, fait: true },
        select: taskSelect,
        orderBy: { updatedAt: "desc" },
        take: 50,
      });
  }
}

export async function getTaskTabCounts(
  userId: string,
  scope: TaskScope,
  role: string | undefined,
): Promise<{
  today: number;
  overdue: number;
  upcoming: number;
  done: number;
}> {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const base = assigneeWhere(userId, scope, role);

  const [today, overdue, upcoming, done] = await Promise.all([
    prisma.task.count({
      where: {
        ...base,
        fait: false,
        date: { gte: dayStart, lte: dayEnd },
      },
    }),
    prisma.task.count({
      where: {
        ...base,
        fait: false,
        date: { lt: dayStart },
      },
    }),
    prisma.task.count({
      where: {
        ...base,
        fait: false,
        date: { gt: dayEnd },
      },
    }),
    prisma.task.count({
      where: { ...base, fait: true },
    }),
  ]);

  return { today, overdue, upcoming, done };
}

/** Tâches sur une plage de dates (agenda). */
export async function getTasksInRange(
  userId: string,
  scope: TaskScope,
  role: string | undefined,
  rangeStart: Date,
  rangeEnd: Date,
  includeDone = false,
): Promise<TaskListItem[]> {
  const base = assigneeWhere(userId, scope, role);

  return prisma.task.findMany({
    where: {
      ...base,
      ...(includeDone ? {} : { fait: false }),
      date: {
        gte: startOfDay(rangeStart),
        lte: endOfDay(rangeEnd),
      },
    },
    select: taskSelect,
    orderBy: [{ date: "asc" }, { heure: "asc" }],
  });
}

export async function getRdvTasksForUser(
  userId: string,
  scope: TaskScope,
  role: string | undefined,
  from: Date,
  to: Date,
): Promise<TaskListItem[]> {
  const base = assigneeWhere(userId, scope, role);

  return prisma.task.findMany({
    where: {
      ...base,
      fait: false,
      type: { in: RDV_TASK_TYPES },
      date: { gte: startOfDay(from), lte: endOfDay(to) },
    },
    select: taskSelect,
    orderBy: [{ date: "asc" }, { heure: "asc" }],
    take: 20,
  });
}

export { canViewAllTasks };
