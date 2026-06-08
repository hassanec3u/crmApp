"use client";

/** En-tête de la fiche prospect : identité, statut, coordonnées cliquables (tel/mail). */
import { Phone, Mail, ExternalLink } from "lucide-react";
import type { Prospect, Statut } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPhone, getReadableTextColor, formatRelative } from "@/lib/format";

interface Props {
  prospect: Prospect & { statut: Statut | null };
}

export function ProspectHeader({ prospect }: Props): JSX.Element {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">
              {prospect.prenom ? `${prospect.prenom} ` : ""}
              {prospect.nom}
            </h1>
            {prospect.statut && (
              <Badge
                className="border-0"
                style={{
                  backgroundColor: prospect.statut.couleur,
                  color: getReadableTextColor(prospect.statut.couleur),
                }}
              >
                {prospect.statut.label}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {prospect.telephone && (
              <a
                href={`tel:${prospect.telephone}`}
                className="flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <Phone className="h-4 w-4" />
                {formatPhone(prospect.telephone)}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {prospect.email && (
              <a
                href={`mailto:${prospect.email}`}
                className="flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <Mail className="h-4 w-4" />
                {prospect.email}
              </a>
            )}
          </div>

          {prospect.source && (
            <p className="text-xs text-muted-foreground">
              Source : {prospect.source}
            </p>
          )}
        </div>

        <div className="text-right text-xs text-muted-foreground">
          <p>Créé {formatRelative(prospect.createdAt)}</p>
          <p>Modifié {formatRelative(prospect.updatedAt)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
