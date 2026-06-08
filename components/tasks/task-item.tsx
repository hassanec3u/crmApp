"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  CalendarDays,
  Check,
  Clock,
  Eye,
  MoreVertical,
  Pencil,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

import { EditTaskDialog } from "@/components/tasks/edit-task-dialog";
import { PostponeTaskDialog } from "@/components/tasks/postpone-task-dialog";
import { TaskTypeBadge } from "@/components/tasks/task-type-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { deleteTask, markTaskDone, toggleTask } from "@/lib/actions/tasks";
import { formatDate } from "@/lib/format";
import type { TaskListItem } from "@/lib/queries/tasks";
import type { AssignableUser } from "@/lib/queries/users";
import { cn } from "@/lib/utils";

interface TaskItemProps {
  task: TaskListItem;
  /** compact = dashboard ; full = page tâches ; prospect = fiche sans lien prospect */
  variant?: "compact" | "full" | "prospect";
  showOverdueBadge?: boolean;
  users?: AssignableUser[];
  currentUserId?: string;
  showAssignee?: boolean;
}

export function TaskItem({
  task,
  variant = "full",
  showOverdueBadge = false,
  users = [],
  currentUserId = "",
  showAssignee = false,
}: TaskItemProps): JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const refresh = (): void => router.refresh();

  const handleDone = (): void => {
    startTransition(async () => {
      const result = await markTaskDone({ taskId: task.id });
      if (result.ok) {
        refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
      }
    });
  };

  const handleDelete = (): void => {
    startTransition(async () => {
      const result = await deleteTask({ taskId: task.id });
      if (result.ok) {
        toast({ variant: "success", title: "Rappel supprimé" });
        refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
      }
    });
  };

  const overdueLabel =
    showOverdueBadge && !task.fait
      ? formatDistanceToNow(new Date(task.date), { locale: fr, addSuffix: false })
      : null;

  const showProspectLink = variant !== "prospect";

  return (
    <li
      className={cn(
        "rounded-lg border p-3 transition-opacity",
        variant === "compact" && showOverdueBadge && "border-red-100 bg-red-50/30",
        task.fait && "opacity-60",
        isPending && "pointer-events-none opacity-50",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TaskTypeBadge type={task.type} />
            {task.heure && !task.fait && (
              <span className="shrink-0 text-xs font-medium text-primary">
                {task.heure}
              </span>
            )}
            <span
              className={cn(
                "text-sm font-medium",
                task.fait && "line-through",
              )}
            >
              {task.titre}
            </span>
            {overdueLabel && (
              <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-medium text-destructive-foreground">
                −{overdueLabel}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatDate(task.date)}
            </span>
            {task.heure && task.fait && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {task.heure}
              </span>
            )}
            {showProspectLink && (
              <Link
                href={`/prospects/${task.prospect.id}`}
                className="truncate hover:text-primary hover:underline"
              >
                {task.prospect.prenom} {task.prospect.nom}
              </Link>
            )}
            {showAssignee &&
              task.assignedUser.name &&
              variant !== "prospect" && (
                <>
                  <span>•</span>
                  <span className="truncate">{task.assignedUser.name}</span>
                </>
              )}
          </div>

          {task.commentaire && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {task.commentaire}
            </p>
          )}
        </div>

        {variant === "full" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!task.fait && (
                <DropdownMenuItem onClick={handleDone}>
                  <Check className="mr-2 h-4 w-4" />
                  Marquer fait
                </DropdownMenuItem>
              )}
              <EditTaskDialog
                task={task}
                users={users}
                currentUserId={currentUserId}
                showAssignee={showAssignee}
                onSuccess={refresh}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Modifier
                  </DropdownMenuItem>
                }
              />
              {!task.fait && (
                <PostponeTaskDialog
                  taskId={task.id}
                  onSuccess={refresh}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Reporter
                    </DropdownMenuItem>
                  }
                />
              )}
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ce rappel ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Le rappel « {task.titre} »
                      sera définitivement supprimé.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {variant === "prospect" && task.fait && (
        <div className="mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              startTransition(async () => {
                const result = await toggleTask({ taskId: task.id });
                if (result.ok) refresh();
                else {
                  toast({
                    variant: "destructive",
                    title: "Erreur",
                    description: result.error,
                  });
                }
              });
            }}
            disabled={isPending}
          >
            Réouvrir
          </Button>
        </div>
      )}

      {/* Actions visibles (mobile + compact) */}
      {(variant === "compact" || variant === "prospect") && !task.fait && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-green-600 hover:bg-green-50 hover:text-green-700"
            onClick={handleDone}
            disabled={isPending}
          >
            <Check className="h-3.5 w-3.5" />
            Fait
          </Button>
          <PostponeTaskDialog
            taskId={task.id}
            onSuccess={refresh}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                disabled={isPending}
              >
                <ArrowRight className="h-3.5 w-3.5" />
                Reporter
              </Button>
            }
          />
          {variant === "prospect" ? (
            <>
              <EditTaskDialog
                task={task}
                users={users}
                currentUserId={currentUserId}
                showAssignee={showAssignee}
                onSuccess={refresh}
                trigger={
                  <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs">
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </Button>
                }
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2 text-xs text-destructive hover:bg-destructive/10"
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ce rappel ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            showProspectLink && (
              <Link href={`/prospects/${task.prospect.id}`}>
                <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs">
                  <Eye className="h-3.5 w-3.5" />
                  Voir
                </Button>
              </Link>
            )
          )}
        </div>
      )}

      {variant === "full" && !task.fait && (
        <div className="mt-2 flex gap-1 md:hidden">
          <Button
            variant="outline"
            size="sm"
            className="h-8 flex-1 text-xs"
            onClick={handleDone}
            disabled={isPending}
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            Fait
          </Button>
          <PostponeTaskDialog
            taskId={task.id}
            onSuccess={refresh}
            trigger={
              <Button variant="outline" size="sm" className="h-8 flex-1 text-xs">
                Reporter
              </Button>
            }
          />
        </div>
      )}
    </li>
  );
}
