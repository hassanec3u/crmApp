/**
 * Widget : Tâches urgentes (en retard).
 */
"use client";

import { AlertTriangle } from "lucide-react";

import { TaskItem } from "@/components/tasks/task-item";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TacheUrgente } from "@/lib/queries/dashboard";
import type { TaskListItem } from "@/lib/queries/tasks";

interface UrgentTasksProps {
  tasks: TacheUrgente[];
}

/** Adapte la forme `TacheUrgente` (requête dashboard) vers `TaskListItem`, attendue par `<TaskItem>`. */
function toTaskListItem(task: TacheUrgente): TaskListItem {
  return {
    id: task.id,
    type: task.type,
    titre: task.titre,
    commentaire: null,
    date: task.date,
    heure: task.heure,
    fait: false,
    prospect: task.prospect,
    assignedUser: task.assignedUser,
  };
}

export function UrgentTasks({ tasks }: UrgentTasksProps) {
  return (
    <Card className="border-red-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          Tâches urgentes
          {tasks.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {tasks.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucune tâche en retard 🎉
          </p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={toTaskListItem(task)}
                variant="compact"
                showOverdueBadge
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
