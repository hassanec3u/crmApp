"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  CheckCircle2,
  Circle,
  CalendarDays,
  Clock,
  Loader2,
} from "lucide-react";
import type { Task } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createTask, toggleTask } from "@/lib/actions/tasks";
import { formatDate } from "@/lib/format";

interface Props {
  prospectId: string;
  tasks: Task[];
}

export function ProspectTasks({ prospectId, tasks }: Props): JSX.Element {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [titre, setTitre] = useState("");
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");
  const [commentaire, setCommentaire] = useState("");

  function handleToggle(taskId: string): void {
    startTransition(async () => {
      const result = await toggleTask({ taskId });
      if (!result.ok) {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      }
    });
  }

  async function handleCreate(): Promise<void> {
    if (!titre.trim() || !date) return;
    const result = await createTask({
      prospectId,
      titre: titre.trim(),
      date,
      heure: heure || undefined,
      commentaire: commentaire || undefined,
    });
    if (result.ok) {
      toast({ variant: "success", title: "Rappel créé" });
      setTitre("");
      setDate("");
      setHeure("");
      setCommentaire("");
      setDialogOpen(false);
    } else {
      toast({ variant: "destructive", title: "Erreur", description: result.error });
    }
  }

  const pending = tasks.filter((t) => !t.fait);
  const done = tasks.filter((t) => t.fait);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">
          Rappels ({pending.length} en cours)
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-3 w-3" />
              Créer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nouveau rappel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="task-titre">Titre *</Label>
                <Input
                  id="task-titre"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex: Rappeler le prospect"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="task-date">Date *</Label>
                  <Input
                    id="task-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-heure">Heure</Label>
                  <Input
                    id="task-heure"
                    type="time"
                    value={heure}
                    onChange={(e) => setHeure(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-commentaire">Commentaire</Label>
                <Input
                  id="task-commentaire"
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder="Détails optionnels"
                />
              </div>
              <Button
                onClick={handleCreate}
                className="w-full"
                disabled={!titre.trim() || !date}
              >
                Créer le rappel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun rappel.</p>
        ) : (
          <>
            {/* En cours */}
            {pending.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isPending={isPending}
                onToggle={handleToggle}
              />
            ))}
            {/* Terminés */}
            {done.length > 0 && (
              <div className="pt-2">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Terminés
                </p>
                {done.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isPending={isPending}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TaskRow({
  task,
  isPending,
  onToggle,
}: {
  task: Task;
  isPending: boolean;
  onToggle: (id: string) => void;
}): JSX.Element {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 ${
        task.fait ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(task.id)}
        disabled={isPending}
        className="mt-0.5 shrink-0"
      >
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : task.fait ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${
            task.fait ? "line-through" : ""
          }`}
        >
          {task.titre}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {formatDate(task.date)}
          </span>
          {task.heure && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.heure}
            </span>
          )}
        </div>
        {task.commentaire && (
          <p className="mt-1 text-xs text-muted-foreground">
            {task.commentaire}
          </p>
        )}
      </div>
    </div>
  );
}
