"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  createStatut,
  deleteStatut,
  reorderStatuts,
  updateStatut,
} from "@/lib/actions/statuts";

import { SortableStatutItem } from "./sortable-statut-item";
import { StatutDialog } from "./statut-dialog";

interface StatutItem {
  id: string;
  label: string;
  couleur: string;
  ordre: number;
}

interface Props {
  initialStatuts: StatutItem[];
}

export function StatutsManager({ initialStatuts }: Props): JSX.Element {
  const { toast } = useToast();
  const [statuts, setStatuts] = useState(initialStatuts);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StatutItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = statuts.findIndex((s) => s.id === active.id);
    const newIndex = statuts.findIndex((s) => s.id === over.id);

    const reordered = arrayMove(statuts, oldIndex, newIndex);
    setStatuts(reordered);

    startTransition(async () => {
      const result = await reorderStatuts({
        orderedIds: reordered.map((s) => s.id),
      });
      if (!result.ok) {
        setStatuts(statuts);
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      }
    });
  }

  function handleCreate(): void {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleEdit(statut: StatutItem): void {
    setEditing(statut);
    setDialogOpen(true);
  }

  async function handleSave(data: {
    label: string;
    couleur: string;
  }): Promise<void> {
    if (editing) {
      const result = await updateStatut({ id: editing.id, ...data });
      if (result.ok) {
        setStatuts((prev) =>
          prev.map((s) => (s.id === editing.id ? { ...s, ...data } : s)),
        );
        toast({ variant: "success", title: "Statut modifié" });
        setDialogOpen(false);
      } else {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      }
    } else {
      const result = await createStatut(data);
      if (result.ok) {
        setStatuts((prev) => [
          ...prev,
          { id: result.data.id, label: data.label, couleur: data.couleur, ordre: prev.length },
        ]);
        toast({ variant: "success", title: "Statut créé" });
        setDialogOpen(false);
      } else {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      }
    }
  }

  function handleDelete(id: string): void {
    startTransition(async () => {
      const result = await deleteStatut(id);
      if (result.ok) {
        setStatuts((prev) => prev.filter((s) => s.id !== id));
        toast({ variant: "success", title: "Statut supprimé" });
      } else {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      }
    });
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Nouveau statut
      </Button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={statuts.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {statuts.map((statut) => (
              <SortableStatutItem
                key={statut.id}
                statut={statut}
                isPending={isPending}
                onEdit={() => handleEdit(statut)}
                onDelete={() => handleDelete(statut.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {statuts.length === 0 && (
        <div className="rounded-xl border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun statut configuré. Créez votre premier statut pour commencer.
          </p>
        </div>
      )}

      <StatutDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSave={handleSave}
      />
    </div>
  );
}
