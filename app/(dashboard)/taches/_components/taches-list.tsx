"use client";

/** Liste des tâches d'un onglet donné, ou message vide adapté à l'onglet. */
import { TaskItem } from "@/components/tasks/task-item";
import type { TaskListItem, TaskTab } from "@/lib/queries/tasks";
import type { AssignableUser } from "@/lib/queries/users";

/** Message affiché quand l'onglet ne contient aucune tâche. */
const EMPTY_MESSAGES: Record<TaskTab, string> = {
  today: "Aucun rappel prévu aujourd'hui.",
  overdue: "Aucune tâche en retard.",
  upcoming: "Aucun rappel à venir.",
  done: "Aucune tâche terminée récemment.",
};

interface TachesListProps {
  tasks: TaskListItem[];
  tab: TaskTab;
  users: AssignableUser[];
  currentUserId: string;
  showAssignee: boolean;
}

export function TachesList({
  tasks,
  tab,
  users,
  currentUserId,
  showAssignee,
}: TachesListProps): JSX.Element {
  if (tasks.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {EMPTY_MESSAGES[tab]}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          variant="full"
          showOverdueBadge={tab === "overdue"}
          users={users}
          currentUserId={currentUserId}
          showAssignee={showAssignee}
        />
      ))}
    </ul>
  );
}
