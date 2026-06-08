"use client";

/** Sélecteur de statut du prospect : grille de boutons colorés, mise à jour en un clic. */
import { useTransition } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { changeProspectStatut } from "@/lib/actions/prospects";
import { getReadableTextColor } from "@/lib/format";

interface Props {
  prospectId: string;
  currentStatutId: string | null;
  statuts: { id: string; label: string; couleur: string }[];
}

export function ProspectStatutSelect({
  prospectId,
  currentStatutId,
  statuts,
}: Props): JSX.Element {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleClick(statutId: string): void {
    // Pas de requête inutile si le statut est déjà sélectionné.
    if (statutId === currentStatutId || isPending) return;
    startTransition(async () => {
      const result = await changeProspectStatut({ prospectId, statutId });
      if (result.ok) {
        toast({ variant: "success", title: "Statut mis à jour" });
      } else {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Changer le statut</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {statuts.map((s) => {
            const active = s.id === currentStatutId;
            return (
              <button
                key={s.id}
                type="button"
                disabled={isPending}
                onClick={() => handleClick(s.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
                  active
                    ? "ring-2 ring-offset-2 ring-offset-background"
                    : "opacity-70 hover:opacity-100"
                }`}
                style={{
                  backgroundColor: s.couleur,
                  color: getReadableTextColor(s.couleur),
                  ...(active ? { ringColor: s.couleur } : {}),
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
