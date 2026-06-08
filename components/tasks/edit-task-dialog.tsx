"use client";

/** Dialogue d'édition d'une tâche existante (pré-rempli avec ses valeurs actuelles). */
import { useEffect, useState, useTransition } from "react";
import type { TaskType } from "@prisma/client";

import { TaskFormFields } from "@/components/tasks/task-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { updateTask } from "@/lib/actions/tasks";
import { formatDateForInput } from "@/lib/format";
import type { TaskListItem } from "@/lib/queries/tasks";
import type { AssignableUser } from "@/lib/queries/users";

interface EditTaskDialogProps {
  task: TaskListItem;
  trigger: React.ReactNode;
  users: AssignableUser[];
  currentUserId: string;
  showAssignee?: boolean;
  onSuccess?: () => void;
}

export function EditTaskDialog({
  task,
  trigger,
  users,
  currentUserId,
  showAssignee = false,
  onSuccess,
}: EditTaskDialogProps): JSX.Element {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TaskType>(task.type);
  const [titre, setTitre] = useState(task.titre);
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState(task.heure ?? "");
  const [commentaire, setCommentaire] = useState(task.commentaire ?? "");
  const [assignedUserId, setAssignedUserId] = useState(
    task.assignedUser.id ?? currentUserId,
  );
  const [isPending, startTransition] = useTransition();

  // Resynchronise le formulaire avec la tâche à chaque ouverture (au cas
  // où les données auraient changé depuis le dernier passage).
  useEffect(() => {
    if (open) {
      setType(task.type);
      setTitre(task.titre);
      setDate(formatDateForInput(task.date));
      setHeure(task.heure ?? "");
      setCommentaire(task.commentaire ?? "");
      setAssignedUserId(task.assignedUser.id);
    }
  }, [open, task, currentUserId]);

  function handleSubmit(): void {
    if (!titre.trim() || !date) return;
    startTransition(async () => {
      const result = await updateTask({
        taskId: task.id,
        type,
        titre: titre.trim(),
        date,
        heure: heure || undefined,
        commentaire: commentaire || undefined,
        assignedUserId: showAssignee ? assignedUserId : undefined,
      });
      if (result.ok) {
        toast({ variant: "success", title: "Tâche modifiée" });
        setOpen(false);
        onSuccess?.();
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier la tâche</DialogTitle>
        </DialogHeader>
        <div className="pt-2">
          <TaskFormFields
            idPrefix="edit-task"
            type={type}
            onTypeChange={setType}
            titre={titre}
            onTitreChange={setTitre}
            date={date}
            onDateChange={setDate}
            heure={heure}
            onHeureChange={setHeure}
            commentaire={commentaire}
            onCommentaireChange={setCommentaire}
            assignedUserId={assignedUserId}
            onAssignedUserIdChange={setAssignedUserId}
            users={users}
            showAssignee={showAssignee}
          />
          <Button
            className="mt-4 w-full"
            onClick={handleSubmit}
            disabled={!titre.trim() || !date || isPending}
          >
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
