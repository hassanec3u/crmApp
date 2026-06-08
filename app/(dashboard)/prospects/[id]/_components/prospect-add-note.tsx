"use client";

/** Formulaire d'ajout rapide d'une note à l'historique d'un prospect. */
import { useState, useTransition } from "react";
import { Send, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { addProspectNote } from "@/lib/actions/prospects";

interface Props {
  prospectId: string;
}

export function ProspectAddNote({ prospectId }: Props): JSX.Element {
  const { toast } = useToast();
  const [contenu, setContenu] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(): void {
    if (!contenu.trim()) return;
    startTransition(async () => {
      const result = await addProspectNote({
        prospectId,
        contenu: contenu.trim(),
      });
      if (result.ok) {
        toast({ variant: "success", title: "Note ajoutée" });
        setContenu("");
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Ajouter une note</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Écrire une note (apparaîtra dans l'historique)..."
          rows={3}
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!contenu.trim() || isPending}
        >
          {isPending ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Send className="mr-1 h-3 w-3" />
          )}
          Envoyer
        </Button>
      </CardContent>
    </Card>
  );
}
