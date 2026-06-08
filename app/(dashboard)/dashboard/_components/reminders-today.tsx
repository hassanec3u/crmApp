/**
 * Widget : Rappels du jour.
 */
"use client";

import { Bell } from "lucide-react";

import { TaskItem } from "@/components/tasks/task-item";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RappelDuJour } from "@/lib/queries/dashboard";
import type { TaskListItem } from "@/lib/queries/tasks";

interface RemindersTodayProps {
  reminders: RappelDuJour[];
}

function toTaskListItem(reminder: RappelDuJour): TaskListItem {
  return {
    id: reminder.id,
    type: reminder.type,
    titre: reminder.titre,
    commentaire: null,
    date: reminder.date,
    heure: reminder.heure,
    fait: reminder.fait,
    prospect: reminder.prospect,
    assignedUser: reminder.assignedUser,
  };
}

export function RemindersToday({ reminders }: RemindersTodayProps) {
  const pending = reminders.filter((r) => !r.fait);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-blue-600" />
          Rappels du jour
          {pending.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {pending.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucun rappel aujourd&apos;hui 🎉
          </p>
        ) : (
          <ul className="space-y-2">
            {pending.map((reminder) => (
              <TaskItem
                key={reminder.id}
                task={toTaskListItem(reminder)}
                variant="compact"
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
