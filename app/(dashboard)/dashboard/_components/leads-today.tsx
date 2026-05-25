/**
 * Widget : Leads du jour.
 * Affiche les prospects créés aujourd'hui.
 */
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LeadDuJour } from "@/lib/queries/dashboard";
import { getReadableTextColor } from "@/lib/format";

interface LeadsTodayProps {
  leads: LeadDuJour[];
}

export function LeadsToday({ leads }: LeadsTodayProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4 text-green-600" />
          Leads du jour
          {leads.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {leads.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucun nouveau lead aujourd&apos;hui 📭
          </p>
        ) : (
          <ul className="space-y-3">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/prospects/${lead.id}`}
                  className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {lead.prenom} {lead.nom}
                      </span>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[10px]"
                      >
                        Nouveau
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {lead.source && <span>{lead.source}</span>}
                      <span>
                        {format(new Date(lead.createdAt), "HH:mm", {
                          locale: fr,
                        })}
                      </span>
                    </div>
                  </div>
                  {lead.statut && (
                    <Badge
                      className="shrink-0 text-[10px]"
                      style={{
                        backgroundColor: lead.statut.couleur,
                        color: getReadableTextColor(lead.statut.couleur),
                      }}
                    >
                      {lead.statut.label}
                    </Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
