"use client";

/** Dialogue de report d'une tâche : propose le lendemain par défaut, modifiable. */
import { useState, useTransition } from "react";
import { addDays } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { postponeTask } from "@/lib/actions/tasks";
import { formatDateForInput } from "@/lib/format";

interface PostponeTaskDialogProps {
  taskId: string;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export function PostponeTaskDialog({
  taskId,
  trigger,
  onSuccess,
}: PostponeTaskDialogProps): JSX.Element {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() =>
    formatDateForInput(addDays(new Date(), 1)),
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit(): void {
    if (!date) return;
    startTransition(async () => {
      const result = await postponeTask({ taskId, date });
      if (result.ok) {
        toast({ variant: "success", title: "Rappel reporté" });
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reporter le rappel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="postpone-date">Nouvelle date</Label>
            <Input
              id="postpone-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!date || isPending}
          >
            {isPending ? "Enregistrement…" : "Reporter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
