/** Badge coloré affichant le type d'une tâche (rappel, RDV, relance…). */
import type { TaskType } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { TASK_TYPE_LABELS } from "@/lib/constants/tasks";
import { cn } from "@/lib/utils";

/** Couleurs Tailwind associées à chaque type, pour un repérage visuel rapide. */
const TYPE_STYLES: Record<TaskType, string> = {
  RAPPEL: "bg-amber-100 text-amber-800 border-amber-200",
  RELANCE: "bg-orange-100 text-orange-800 border-orange-200",
  RDV: "bg-blue-100 text-blue-800 border-blue-200",
  VERIFICATION: "bg-violet-100 text-violet-800 border-violet-200",
  SUIVI: "bg-teal-100 text-teal-800 border-teal-200",
};

interface TaskTypeBadgeProps {
  type: TaskType;
  className?: string;
}

export function TaskTypeBadge({ type, className }: TaskTypeBadgeProps): JSX.Element {
  return (
    <Badge
      variant="outline"
      className={cn("shrink-0 text-[10px] font-medium", TYPE_STYLES[type], className)}
    >
      {TASK_TYPE_LABELS[type]}
    </Badge>
  );
}
