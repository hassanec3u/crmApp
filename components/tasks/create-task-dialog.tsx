"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Plus, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createTask, searchProspectsForTask } from "@/lib/actions/tasks";
import { formatDateForInput } from "@/lib/format";
import type { AssignableUser } from "@/lib/queries/users";

interface ProspectHit {
  id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
}

interface CreateTaskDialogProps {
  users: AssignableUser[];
  currentUserId: string;
  showAssignee?: boolean;
  /** Bouton déclencheur personnalisé ; défaut = FAB */
  trigger?: React.ReactNode;
  /** Prospect pré-sélectionné (fiche prospect) */
  defaultProspect?: ProspectHit;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateTaskDialog({
  users,
  currentUserId,
  showAssignee = false,
  trigger,
  defaultProspect,
  open: controlledOpen,
  onOpenChange,
}: CreateTaskDialogProps): JSX.Element {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<ProspectHit[]>([]);
  const [selected, setSelected] = useState<ProspectHit | null>(
    defaultProspect ?? null,
  );

  const [type, setType] = useState<TaskType>("RAPPEL");
  const [titre, setTitre] = useState("");
  const [date, setDate] = useState(() => formatDateForInput(new Date()));
  const [heure, setHeure] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [assignedUserId, setAssignedUserId] = useState(currentUserId);

  const resetForm = useCallback((): void => {
    setSearch("");
    setHits([]);
    setSelected(defaultProspect ?? null);
    setType("RAPPEL");
    setTitre("");
    setDate(formatDateForInput(new Date()));
    setHeure("");
    setCommentaire("");
    setAssignedUserId(currentUserId);
  }, [currentUserId, defaultProspect]);

  useEffect(() => {
    if (!open) return;
    if (defaultProspect) setSelected(defaultProspect);
  }, [open, defaultProspect]);

  useEffect(() => {
    if (defaultProspect || search.length < 2) {
      setHits([]);
      return;
    }
    const timer = setTimeout(() => {
      void searchProspectsForTask({ q: search }).then((res) => {
        if (res.ok) setHits(res.data);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, defaultProspect]);

  function handleSubmit(): void {
    if (!selected || !titre.trim() || !date) return;
    startTransition(async () => {
      const result = await createTask({
        prospectId: selected.id,
        type,
        titre: titre.trim(),
        date,
        heure: heure || undefined,
        commentaire: commentaire || undefined,
        assignedUserId: showAssignee ? assignedUserId : undefined,
      });
      if (result.ok) {
        toast({ variant: "success", title: "Tâche créée" });
        resetForm();
        setOpen(false);
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
      }
    });
  }

  const defaultTrigger = (
    <Button
      size="icon"
      className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full shadow-lg md:bottom-8 md:right-8"
      aria-label="Nouvelle tâche"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle tâche</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!defaultProspect && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un prospect (nom, email…)"
                  className="pl-9"
                />
              </div>
              {selected && (
                <p className="text-sm font-medium text-primary">
                  {selected.prenom} {selected.nom}
                </p>
              )}
              {hits.length > 0 && (
                <ul className="max-h-36 overflow-y-auto rounded-md border">
                  {hits.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setSelected(p);
                          setSearch("");
                          setHits([]);
                        }}
                      >
                        <span className="font-medium">
                          {p.prenom} {p.nom}
                        </span>
                        {p.email && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {p.email}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <TaskFormFields
            idPrefix="create-task"
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
            showTemplates
          />

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!selected || !titre.trim() || !date || isPending}
          >
            {isPending ? "Création…" : "Créer la tâche"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
