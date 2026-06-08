"use client";

/** Zone de notes internes éditable, avec sauvegarde manuelle (bouton activé si modifié). */
import { useState, useTransition } from "react";
import { Save, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { updateProspectNotes } from "@/lib/actions/prospects";

interface Props {
  prospectId: string;
  notes: string | null;
}

export function ProspectNotes({ prospectId, notes }: Props): JSX.Element {
  const { toast } = useToast();
  const [value, setValue] = useState(notes ?? "");
  const [isPending, startTransition] = useTransition();
  // N'active le bouton de sauvegarde que si le contenu a réellement changé.
  const isDirty = value !== (notes ?? "");

  function handleSave(): void {
    startTransition(async () => {
      const result = await updateProspectNotes({
        prospectId,
        notes: value,
      });
      if (result.ok) {
        toast({ variant: "success", title: "Notes sauvegardées" });
      } else {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">Notes internes</CardTitle>
        {isDirty && (
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Save className="mr-1 h-3 w-3" />
            )}
            Sauvegarder
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Notes internes libres..."
          rows={5}
          className="resize-y"
        />
      </CardContent>
    </Card>
  );
}
