"use client";

/**
 * Gestion des tags d'un prospect : ajout depuis la liste existante de
 * l'utilisateur, ou création à la volée d'un nouveau tag coloré.
 */
import { useState, useTransition } from "react";
import { Plus, X, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
  addTagToProspect,
  removeTagFromProspect,
} from "@/lib/actions/prospects";
import { createTag } from "@/lib/actions/tags";
import { getReadableTextColor } from "@/lib/format";
import { COLOR_PALETTE } from "@/lib/constants";

interface Props {
  prospectId: string;
  currentTags: { id: string; label: string; couleur: string }[];
  allTags: { id: string; label: string; couleur: string }[];
}

export function ProspectTags({
  prospectId,
  currentTags,
  allTags,
}: Props): JSX.Element {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagColor, setNewTagColor] = useState("#10b981");

  const availableTags = allTags.filter(
    (t) => !currentTags.some((ct) => ct.id === t.id),
  );

  function handleAdd(tagId: string): void {
    startTransition(async () => {
      const result = await addTagToProspect({ prospectId, tagId });
      if (result.ok) {
        toast({ variant: "success", title: "Tag ajouté" });
      } else {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      }
    });
  }

  function handleRemove(tagId: string): void {
    startTransition(async () => {
      const result = await removeTagFromProspect({ prospectId, tagId });
      if (result.ok) {
        toast({ variant: "success", title: "Tag retiré" });
      } else {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      }
    });
  }

  async function handleCreateTag(): Promise<void> {
    if (!newTagLabel.trim()) return;
    const tagResult = await createTag({
      label: newTagLabel.trim(),
      couleur: newTagColor,
    });
    if (!tagResult.ok) {
      toast({ variant: "destructive", title: "Erreur", description: tagResult.error });
      return;
    }
    // Attache directement le tag créé au prospect
    const addResult = await addTagToProspect({
      prospectId,
      tagId: tagResult.data.id,
    });
    if (addResult.ok) {
      toast({ variant: "success", title: `Tag "${newTagLabel.trim()}" créé et ajouté` });
      setNewTagLabel("");
      setPopoverOpen(false);
    } else {
      toast({ variant: "destructive", title: "Erreur", description: addResult.error });
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">Tags</CardTitle>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-3 w-3" />
              Ajouter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-3" align="end">
            <p className="text-sm font-medium">Tags existants</p>
            {availableTags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {availableTags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleAdd(t.id)}
                    disabled={isPending}
                    className="rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                    style={{
                      backgroundColor: t.couleur,
                      color: getReadableTextColor(t.couleur),
                      borderColor: t.couleur,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Tous les tags sont déjà attribués.
              </p>
            )}

            <div className="border-t pt-3">
              <p className="mb-2 text-sm font-medium">Créer un nouveau tag</p>
              <div className="flex gap-2">
                <Input
                  value={newTagLabel}
                  onChange={(e) => setNewTagLabel(e.target.value)}
                  placeholder="Ex: Investisseur"
                  className="h-8 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateTag();
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={handleCreateTag}
                  disabled={!newTagLabel.trim()}
                >
                  OK
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {COLOR_PALETTE.slice(0, 10).map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setNewTagColor(c.value)}
                    className={`h-5 w-5 rounded-full border-2 transition-transform ${
                      newTagColor === c.value
                        ? "scale-125 border-foreground"
                        : "border-transparent hover:scale-110"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent>
        {currentTags.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun tag attribué.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {currentTags.map((tag) => (
              <Badge
                key={tag.id}
                className="gap-1 border-0 pr-1"
                style={{
                  backgroundColor: tag.couleur,
                  color: getReadableTextColor(tag.couleur),
                }}
              >
                {tag.label}
                <button
                  type="button"
                  onClick={() => handleRemove(tag.id)}
                  disabled={isPending}
                  className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-black/20 disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
