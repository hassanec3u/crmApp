/**
 * Page Tâches — placeholder (sera implémentée en phase suivante).
 */
import { Bell } from "lucide-react";

export default function TachesPage(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Bell className="h-12 w-12 text-muted-foreground/50" />
      <h1 className="mt-4 text-xl font-semibold">Tâches</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        La vue tâches complète sera disponible prochainement.
      </p>
    </div>
  );
}
