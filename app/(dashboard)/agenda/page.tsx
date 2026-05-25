/**
 * Page Agenda — placeholder (sera implémentée en phase suivante).
 */
import { Calendar } from "lucide-react";

export default function AgendaPage(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Calendar className="h-12 w-12 text-muted-foreground/50" />
      <h1 className="mt-4 text-xl font-semibold">Agenda</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        L&apos;agenda avec synchronisation Google Calendar sera disponible prochainement.
      </p>
    </div>
  );
}
