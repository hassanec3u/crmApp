"use client";

/** Bouton d'action destructive en masse avec confirmation renforcée (mot à taper). */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { ActionResult } from "@/lib/actions/prospects";

const CONFIRM_WORD = "SUPPRIMER";

interface DangerZoneActionProps {
  title: string;
  description: string;
  count: number;
  itemLabelSingular: string;
  itemLabelPlural: string;
  action: () => Promise<ActionResult<{ count: number }>>;
}

export function DangerZoneAction({
  title,
  description,
  count,
  itemLabelSingular,
  itemLabelPlural,
  action,
}: DangerZoneActionProps): JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [confirmText, setConfirmText] = useState("");

  const label = (n: number): string => (n > 1 ? itemLabelPlural : itemLabelSingular);
  const canConfirm = confirmText === CONFIRM_WORD && count > 0;

  function handleDelete(): void {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast({
          variant: "success",
          title: "Suppression effectuée",
          description: `${result.data.count} ${label(result.data.count)} supprimé(s).`,
        });
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      }
    });
  }

  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!open) setConfirmText("");
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={count === 0}>
          <Trash2 className="mr-2 h-4 w-4" />
          {title}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title} ?</AlertDialogTitle>
          <AlertDialogDescription>
            {description} Cette action supprimera définitivement{" "}
            <strong>
              {count} {label(count)}
            </strong>{" "}
            et est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Tapez <strong>{CONFIRM_WORD}</strong> ci-dessous pour confirmer.
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_WORD}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!canConfirm || isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmer la suppression
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
