"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TaskItem } from "@/components/tasks/task-item";
import { Button } from "@/components/ui/button";
import type { TaskScope } from "@/lib/constants/tasks";
import type { TaskListItem } from "@/lib/queries/tasks";
import type { AssignableUser } from "@/lib/queries/users";
import { cn } from "@/lib/utils";

type SerializedTask = Omit<TaskListItem, "date"> & { date: string };

interface AgendaViewProps {
  tasks: SerializedTask[];
  view: "day" | "week";
  anchorDate: string;
  scope: TaskScope;
  canViewAll: boolean;
  users: AssignableUser[];
  currentUserId: string;
  showAssignee: boolean;
}

function deserializeTask(t: SerializedTask): TaskListItem {
  return { ...t, date: new Date(t.date) };
}

export function AgendaView({
  tasks,
  view,
  anchorDate,
  scope,
  canViewAll,
  users,
  currentUserId,
  showAssignee,
}: AgendaViewProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const anchor = parseISO(anchorDate);

  function pushParams(updates: Record<string, string>): void {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      params.set(k, v);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}` as Parameters<
        typeof router.push
      >[0]);
    });
  }

  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(anchor, { weekStartsOn: 1 }),
  });

  const tasksByDay = new Map<string, TaskListItem[]>();
  for (const raw of tasks) {
    const task = deserializeTask(raw);
    const key = format(task.date, "yyyy-MM-dd");
    const list = tasksByDay.get(key) ?? [];
    list.push(task);
    tasksByDay.set(key, list);
  }

  const displayDays =
    view === "week"
      ? weekDays
      : [anchor];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border p-1">
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => pushParams({ view: v })}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {v === "day" ? "Jour" : "Semaine"}
            </button>
          ))}
        </div>

        {canViewAll && (
          <div className="flex gap-1">
            {(
              [
                { id: "mine" as const, label: "Mes tâches" },
                { id: "all" as const, label: "Équipe" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => pushParams({ scope: opt.id })}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm",
                  scope === opt.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            const delta = view === "week" ? -7 : -1;
            pushParams({
              date: format(addDays(anchor, delta), "yyyy-MM-dd"),
            });
          }}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium capitalize">
          {view === "week"
            ? `Semaine du ${format(weekStart, "d MMMM yyyy", { locale: fr })}`
            : format(anchor, "EEEE d MMMM yyyy", { locale: fr })}
        </p>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            const delta = view === "week" ? 7 : 1;
            pushParams({
              date: format(addDays(anchor, delta), "yyyy-MM-dd"),
            });
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {view === "week" && (
        <div className="grid grid-cols-7 gap-1 overflow-x-auto">
          {weekDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const count = tasksByDay.get(key)?.length ?? 0;
            const isSelected = format(anchor, "yyyy-MM-dd") === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => pushParams({ date: key, view: "day" })}
                className={cn(
                  "flex min-w-[2.75rem] flex-col items-center rounded-lg border p-2 text-center",
                  isSelected && "border-primary bg-primary/10",
                )}
              >
                <span className="text-[10px] uppercase text-muted-foreground">
                  {format(day, "EEE", { locale: fr })}
                </span>
                <span className="text-sm font-semibold">{format(day, "d")}</span>
                {count > 0 && (
                  <span className="mt-0.5 text-[10px] text-primary">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-6">
        {displayDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDay.get(key) ?? [];
          if (view === "week" && dayTasks.length === 0) return null;

          return (
            <section key={key}>
              {view === "week" && (
                <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                  {format(day, "EEEE d MMMM", { locale: fr })}
                </h2>
              )}
              {dayTasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucune tâche ce jour-là.
                </p>
              ) : (
                <ul className="space-y-2">
                  {dayTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      variant="full"
                      users={users}
                      currentUserId={currentUserId}
                      showAssignee={showAssignee}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/taches" className="text-primary hover:underline">
          Voir toutes les tâches
        </Link>
      </p>
    </div>
  );
}
