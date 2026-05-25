/**
 * Widget : Prospects à relancer.
 * Prospects sans activité depuis plus de 7 jours.
 */
"use client";

import Link from "next/link";
import { UserX, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createQuickReminder } from "@/lib/actions/dashboard";
import type { ProspectARelancer } from "@/lib/queries/dashboard";
import { getReadableTextColor } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ProspectsToFollowUpProps {
  prospects: ProspectARelancer[];
}

export function ProspectsToFollowUp({ prospects }: ProspectsToFollowUpProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserX className="h-4 w-4 text-orange-600" />
          Prospects à relancer
          {prospects.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {prospects.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {prospects.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Tous les prospects sont à jour ✅
          </p>
        ) : (
          <ul className="space-y-2">
            {prospects.map((prospect) => (
              <ProspectRelanceItem key={prospect.id} prospect={prospect} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ProspectRelanceItem({
  prospect,
}: {
  prospect: ProspectARelancer;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCreateReminder = () => {
    startTransition(async () => {
      await createQuickReminder({ prospectId: prospect.id });
      router.refresh();
    });
  };

  return (
    <li
      className={cn(
        "flex items-center justify-between rounded-lg border p-3",
        isPending && "pointer-events-none opacity-50",
      )}
    >
      <div className="min-w-0 flex-1">
        <Link
          href={`/prospects/${prospect.id}`}
          className="flex items-center gap-2 hover:underline"
        >
          <span className="truncate text-sm font-medium">
            {prospect.prenom} {prospect.nom}
          </span>
          {prospect.statut && (
            <Badge
              className="shrink-0 text-[10px]"
              style={{
                backgroundColor: prospect.statut.couleur,
                color: getReadableTextColor(prospect.statut.couleur),
              }}
            >
              {prospect.statut.label}
            </Badge>
          )}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">
          <span className="font-medium text-orange-600">
            {prospect.joursSansContact}j
          </span>{" "}
          sans contact
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="ml-2 h-8 shrink-0 gap-1 text-xs"
        onClick={handleCreateReminder}
        disabled={isPending}
      >
        <Plus className="h-3 w-3" />
        Rappel
      </Button>
    </li>
  );
}
