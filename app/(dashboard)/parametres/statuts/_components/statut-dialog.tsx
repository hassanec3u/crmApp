"use client";

/**
 * Dialogue de création/édition d'un statut : libellé et couleur
 * (choisie dans une palette prédéfinie). Le même composant sert
 * pour la création (`editing` nul) et l'édition (`editing` rempli).
 */
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COLOR_PALETTE } from "@/lib/constants";
import { getReadableTextColor } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: { id: string; label: string; couleur: string } | null;
  onSave: (data: { label: string; couleur: string }) => Promise<void>;
}

export function StatutDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: Props): JSX.Element {
  const [label, setLabel] = useState("");
  const [couleur, setCouleur] = useState("#3b82f6");
  const [isSaving, setIsSaving] = useState(false);

  // Resynchronise le formulaire à chaque ouverture : pré-remplit avec le statut
  // édité, ou repart sur des valeurs vierges en mode création.
  useEffect(() => {
    if (open) {
      setLabel(editing?.label ?? "");
      setCouleur(editing?.couleur ?? "#3b82f6");
    }
  }, [open, editing]);

  async function handleSubmit(): Promise<void> {
    if (!label.trim()) return;
    setIsSaving(true);
    try {
      await onSave({ label: label.trim(), couleur });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Modifier le statut" : "Nouveau statut"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Libellé */}
          <div className="space-y-2">
            <Label htmlFor="statut-label">Libellé</Label>
            <Input
              id="statut-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: En négociation"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>

          {/* Aperçu */}
          <div className="space-y-2">
            <Label>Aperçu</Label>
            <div>
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold"
                style={{
                  backgroundColor: couleur,
                  color: getReadableTextColor(couleur),
                }}
              >
                {label || "Aperçu"}
              </span>
            </div>
          </div>

          {/* Palette de couleurs */}
          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCouleur(c.value)}
                  className={`h-8 w-8 rounded-lg border-2 transition-transform ${
                    couleur === c.value
                      ? "scale-110 border-foreground ring-2 ring-ring ring-offset-2"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
            {/* Input couleur personnalisée */}
            <div className="flex items-center gap-2 pt-1">
              <Label htmlFor="custom-color" className="text-xs text-muted-foreground">
                Couleur personnalisée :
              </Label>
              <input
                id="custom-color"
                type="color"
                value={couleur}
                onChange={(e) => setCouleur(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded border"
              />
              <span className="text-xs text-muted-foreground">{couleur}</span>
            </div>
          </div>

          {/* Bouton */}
          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={!label.trim() || isSaving}
          >
            {editing ? "Enregistrer" : "Créer le statut"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
