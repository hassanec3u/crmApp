"use client";

/** Liste de prospects sous forme de cartes cliquables (nom, statut, contact, dernière activité). */
import Link from "next/link";
import { Phone, Mail, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatPhone, formatRelative, getReadableTextColor } from "@/lib/format";
import type { ProspectListItem } from "@/lib/queries/prospects";

interface Props {
  items: ProspectListItem[];
}

export function ProspectTable({ items }: Props): JSX.Element {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">Aucun prospect trouvé</p>
        <p className="text-xs text-muted-foreground">
          Modifiez vos filtres ou créez un nouveau prospect.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/prospects/${item.id}`}
          className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/50"
        >
          {/* Contenu principal */}
          <div className="min-w-0 flex-1 space-y-1">
            {/* Nom + badge statut */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {item.prenom ? `${item.prenom} ` : ""}
                {item.nom}
              </span>
              {item.statut && (
                <Badge
                  className="border-0 text-xs"
                  style={{
                    backgroundColor: item.statut.couleur,
                    color: getReadableTextColor(item.statut.couleur),
                  }}
                >
                  {item.statut.label}
                </Badge>
              )}
            </div>

            {/* Coordonnées */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {item.telephone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {formatPhone(item.telephone)}
                </span>
              )}
              {item.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {item.email}
                </span>
              )}
            </div>

            {/* Tags + dernière action */}
            <div className="flex flex-wrap items-center gap-2">
              {item.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="text-[10px]"
                  style={{ borderColor: tag.couleur, color: tag.couleur }}
                >
                  {tag.label}
                </Badge>
              ))}
              {item.lastAction && (
                <span className="text-xs text-muted-foreground">
                  {formatRelative(item.lastAction.createdAt)}
                </span>
              )}
            </div>
          </div>

          {/* Flèche */}
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      ))}
    </div>
  );
}
