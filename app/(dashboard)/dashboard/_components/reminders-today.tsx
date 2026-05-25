/**
 * Widget : Rappels du jour.
 * Tâches programmées pour aujourd'hui avec actions rapides.
 */
"use client";

import Link from "next/link";
import { Bell, Check, ArrowRight, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markTaskDone, postponeTask } from "@/lib/actions/dashboard";
import type { RappelDuJour } from "@/lib/queries/dashboard";
import { cn } from "@/lib/utils";

interface RemindersTodayProps {
  reminders: RappelDuJour[];
}

export function RemindersToday({ reminders }: RemindersTodayProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-blue-600" />
          Rappels du jour
          {reminders.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {reminders.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reminders.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucun rappel aujourd&apos;hui 🎉
          </p>
        ) : (
          <ul className="space-y-2">
            {reminders.map((reminder) => (
              <ReminderItem key={reminder.id} reminder={reminder} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ReminderItem({ reminder }: { reminder: RappelDuJour }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDone = () => {
    startTransition(async () => {
      await markTaskDone({ taskId: reminder.id });
      router.refresh();
    });
  };

  const handlePostpone = () => {
    startTransition(async () => {
      await postponeTask({ taskId: reminder.id });
      router.refresh();
    });
  };

  return (
    <li
      className={cn(
        "rounded-lg border p-3 transition-opacity",
        reminder.fait && "opacity-50",
        isPending && "pointer-events-none opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {reminder.heure && (
              <span className="shrink-0 text-xs font-medium text-primary">
                {reminder.heure}
              </span>
            )}
            <span
              className={cn(
                "truncate text-sm font-medium",
                reminder.fait && "line-through",
              )}
            >
              {reminder.titre}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Link
              href={`/prospects/${reminder.prospect.id}`}
              className="truncate hover:text-primary hover:underline"
            >
              {reminder.prospect.prenom} {reminder.prospect.nom}
            </Link>
            {reminder.assignedUser.name && (
              <>
                <span>•</span>
                <span className="truncate">
                  {reminder.assignedUser.name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {!reminder.fait && (
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
          <Link href={`/prospects/${reminder.prospect.id}`}>
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
      )}
    </li>
  );
}
