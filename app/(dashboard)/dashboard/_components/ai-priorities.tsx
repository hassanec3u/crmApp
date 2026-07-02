/**
 * Widget : Priorités IA du jour.
 * Classement chaud/tiède/froid calculé par n8n + Claude, avec bouton
 * de rafraîchissement manuel.
 */
"use client";

import Link from "next/link";
import { PriorityScore } from "@prisma/client";
import { Sparkles, RefreshCw } from "lucide-react";
import { useTransition } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { refreshAiPriorities } from "@/lib/actions/ai";
import type { PrioriteIA } from "@/lib/queries/ai-priorities";
import { cn } from "@/lib/utils";

interface AiPrioritiesProps {
  priorites: PrioriteIA[];
}

const SCORE_STYLES: Record<PriorityScore, string> = {
  [PriorityScore.CHAUD]: "border-transparent bg-red-600 text-white hover:bg-red-600/90",
  [PriorityScore.TIEDE]: "border-transparent bg-orange-500 text-white hover:bg-orange-500/90",
  [PriorityScore.FROID]: "border-transparent bg-muted text-muted-foreground",
};

const SCORE_LABELS: Record<PriorityScore, string> = {
  [PriorityScore.CHAUD]: "Chaud",
  [PriorityScore.TIEDE]: "Tiède",
  [PriorityScore.FROID]: "Froid",
};

export function AiPriorities({ priorites }: AiPrioritiesProps): JSX.Element {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleRefresh(): void {
    startTransition(async () => {
      const result = await refreshAiPriorities();
      if (result.ok) {
        toast({
          variant: "success",
          title: "Analyse lancée",
          description: "Résultat disponible dans quelques minutes.",
        });
      } else {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-violet-600" />
          Priorités IA du jour
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-8 gap-1 text-xs"
            onClick={handleRefresh}
            disabled={isPending}
          >
            <RefreshCw className={cn("h-3 w-3", isPending && "animate-spin")} />
            Actualiser
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {priorites.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucune analyse pour l&apos;instant — clique sur Actualiser.
          </p>
        ) : (
          <ul className="space-y-2">
            {priorites.map((p) => (
              <li key={p.id} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/prospects/${p.prospectId}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {p.prospectPrenom} {p.prospectNom}
                  </Link>
                  <Badge className={cn("shrink-0 text-[10px]", SCORE_STYLES[p.score])}>
                    {SCORE_LABELS[p.score]}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.raison}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
