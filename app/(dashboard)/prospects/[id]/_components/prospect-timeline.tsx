"use client";

import {
  Phone,
  Mail,
  MessageSquare,
  Users,
  StickyNote,
  ArrowRightLeft,
  ListTodo,
  CheckSquare,
  Tag,
  TagIcon,
  Activity,
} from "lucide-react";
import type { HistoriqueAction, HistoriqueType, User } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

type HistoriqueWithUser = HistoriqueAction & {
  user: Pick<User, "id" | "name" | "image">;
};

interface Props {
  historiques: HistoriqueWithUser[];
}

const ICONS: Record<HistoriqueType, typeof Activity> = {
  CALL: Phone,
  EMAIL: Mail,
  SMS: MessageSquare,
  MEETING: Users,
  NOTE: StickyNote,
  STATUS_CHANGE: ArrowRightLeft,
  TASK_CREATED: ListTodo,
  TASK_DONE: CheckSquare,
  TAG_ADDED: Tag,
  TAG_REMOVED: TagIcon,
  OTHER: Activity,
};

const LABELS: Record<HistoriqueType, string> = {
  CALL: "Appel",
  EMAIL: "Email",
  SMS: "SMS",
  MEETING: "Rendez-vous",
  NOTE: "Note",
  STATUS_CHANGE: "Changement de statut",
  TASK_CREATED: "Rappel créé",
  TASK_DONE: "Rappel terminé",
  TAG_ADDED: "Tag ajouté",
  TAG_REMOVED: "Tag retiré",
  OTHER: "Autre",
};

export function ProspectTimeline({ historiques }: Props): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Historique ({historiques.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {historiques.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune action enregistrée.</p>
        ) : (
          <div className="relative space-y-0">
            {/* Ligne verticale */}
            <div className="absolute left-[15px] top-0 h-full w-px bg-border" />

            {historiques.map((h) => {
              const Icon = ICONS[h.type] ?? Activity;
              return (
                <div key={h.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* Icône */}
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>

                  {/* Contenu */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium">
                        {LABELS[h.type] ?? h.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(h.createdAt)}
                      </span>
                    </div>
                    {h.contenu && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {h.contenu}
                      </p>
                    )}
                    {h.user.name && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        par {h.user.name}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
