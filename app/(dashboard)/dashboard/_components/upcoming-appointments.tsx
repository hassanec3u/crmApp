/**
 * Widget : Rendez-vous à venir (7 prochains jours).
 */
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { fr } from "date-fns/locale";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RendezVous } from "@/lib/queries/dashboard";

interface UpcomingAppointmentsProps {
  appointments: RendezVous[];
}

/** Libellé relatif lisible : "Aujourd'hui" / "Demain" / sinon le jour de la semaine. */
function getDateLabel(date: Date): string {
  if (isToday(date)) return "Aujourd'hui";
  if (isTomorrow(date)) return "Demain";
  return format(date, "EEEE d MMM", { locale: fr });
}

export function UpcomingAppointments({
  appointments,
}: UpcomingAppointmentsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-purple-600" />
          Rendez-vous à venir
          {appointments.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {appointments.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucun rendez-vous prévu 📅
          </p>
        ) : (
          <ul className="space-y-3">
            {appointments.map((rdv) => {
              const dateObj = new Date(rdv.date);
              const dateLabel = getDateLabel(dateObj);

              return (
                <li
                  key={rdv.id}
                  className="rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {rdv.titre}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-medium capitalize text-foreground">
                          {dateLabel}
                        </span>
                        {rdv.heure && <span>à {rdv.heure}</span>}
                        <span>•</span>
                        <Link
                          href={`/prospects/${rdv.prospect.id}`}
                          className="truncate hover:text-primary hover:underline"
                        >
                          {rdv.prospect.prenom} {rdv.prospect.nom}
                        </Link>
                      </div>
                      {rdv.commentaire && (
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{rdv.commentaire}</span>
                        </div>
                      )}
                    </div>
                    {isToday(dateObj) && (
                      <Badge className="shrink-0 bg-purple-100 text-[10px] text-purple-700">
                        Aujourd&apos;hui
                      </Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
