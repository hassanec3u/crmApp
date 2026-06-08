"use client";

import type { Task } from "@prisma/client";

import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TaskItem } from "@/components/tasks/task-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskListItem } from "@/lib/queries/tasks";
import type { AssignableUser } from "@/lib/queries/users";

interface Props {
  prospectId: string;
  prospectNom: string;
  prospectPrenom: string | null;
  prospectEmail: string | null;
  tasks: Task[];
  users: AssignableUser[];
  currentUserId: string;
  showAssignee: boolean;
}

function toTaskListItem(
  task: Task,
  prospect: TaskListItem["prospect"],
  assignedUser: TaskListItem["assignedUser"],
): TaskListItem {
  return {
    id: task.id,
    type: task.type,
    titre: task.titre,
    commentaire: task.commentaire,
    date: task.date,
    heure: task.heure,
    fait: task.fait,
    prospect,
    assignedUser,
  };
}

export function ProspectTasks({
  prospectId,
  prospectNom,
  prospectPrenom,
  prospectEmail,
  tasks,
  users,
  currentUserId,
  showAssignee,
}: Props): JSX.Element {
  const prospect = {
    id: prospectId,
    nom: prospectNom,
    prenom: prospectPrenom,
  };

  const defaultProspect = {
    id: prospectId,
    nom: prospectNom,
    prenom: prospectPrenom,
    email: prospectEmail,
  };

  const pending = tasks.filter((t) => !t.fait);
  const done = tasks.filter((t) => t.fait);

  const resolveAssignee = (task: Task): TaskListItem["assignedUser"] => {
    const u = users.find((x) => x.id === task.assignedUserId);
    return { id: task.assignedUserId, name: u?.name ?? null };
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">
          Rappels ({pending.length} en cours)
        </CardTitle>
        <CreateTaskDialog
          users={users}
          currentUserId={currentUserId}
          showAssignee={showAssignee}
          defaultProspect={defaultProspect}
          trigger={
            <button
              type="button"
              className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
            >
              + Créer
            </button>
          }
        />
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun rappel.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {pending.map((task) => (
                <TaskItem
                  key={task.id}
                  task={toTaskListItem(task, prospect, resolveAssignee(task))}
                  variant="prospect"
                  users={users}
                  currentUserId={currentUserId}
                  showAssignee={showAssignee}
                />
              ))}
            </ul>
            {done.length > 0 && (
              <div className="pt-2">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Terminés
                </p>
                <ul className="space-y-2">
                  {done.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={toTaskListItem(task, prospect, resolveAssignee(task))}
                      variant="prospect"
                      users={users}
                      currentUserId={currentUserId}
                      showAssignee={showAssignee}
                    />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
