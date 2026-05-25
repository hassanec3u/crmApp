/**
 * Widget : Tâches urgentes (en retard).
 * Tâches non faites dont la date est dépassée.
 */
"use client";

import Link from "next/link";
import { AlertTriangle, Check, ArrowRight, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markTaskDone, postponeTask } from "@/lib/actions/dashboard";
import type { TacheUrgente } from "@/lib/queries/dashboard";
import { cn } from "@/lib/utils";

interface UrgentTasksProps {
  tasks: TacheUrgente[];
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
              <UrgentTaskItem key={task.id} task={task} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function UrgentTaskItem({ task }: { task: TacheUrgente }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDone = () => {
    startTransition(async () => {
      await markTaskDone({ taskId: task.id });
      router.refresh();
    });
  };

  const handlePostpone = () => {
    startTransition(async () => {
      await postponeTask({ taskId: task.id });
      router.refresh();
    });
  };

  const retard = formatDistanceToNow(new Date(task.date), {
    locale: fr,
    addSuffix: false,
  });

  return (
    <li
      className={cn(
        "rounded-lg border border-red-100 bg-red-50/30 p-3",
        isPending && "pointer-events-none opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{task.titre}</span>
            <Badge
              variant="destructive"
              className="shrink-0 text-[10px]"
            >
              -{retard}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Link
              href={`/prospects/${task.prospect.id}`}
              className="truncate hover:text-primary hover:underline"
            >
              {task.prospect.prenom} {task.prospect.nom}
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-green-600 hover:bg-green-50 hover:text-green-700"
          onClick={handleDone}
          disabled={isPending}
        >
          <Check className="h-3 w-3" />
          Fait
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-orange-600 hover:bg-orange-50 hover:text-orange-700"
          onClick={handlePostpone}
          disabled={isPending}
        >
          <ArrowRight className="h-3 w-3" />
          Reporter
        </Button>
        <Link href={`/prospects/${task.prospect.id}`}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
          >
            <Eye className="h-3 w-3" />
            Voir
          </Button>
        </Link>
      </div>
    </li>
  );
}
