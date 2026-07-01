/** Section "Zone dangereuse" — actions de suppression en masse (tâches / prospects). */
import { deleteAllMyProspects } from "@/lib/actions/prospects";
import { deleteAllMyTasks } from "@/lib/actions/tasks";

import { DangerZoneAction } from "./danger-zone-action";

interface DangerZoneProps {
  tasksCount: number;
  prospectsCount: number;
}

export function DangerZone({ tasksCount, prospectsCount }: DangerZoneProps): JSX.Element {
  return (
    <section className="space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
      <div>
        <h2 className="text-lg font-semibold text-destructive">Zone dangereuse</h2>
        <p className="text-sm text-muted-foreground">
          Ces actions sont irréversibles et suppriment définitivement vos données.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <DangerZoneAction
          title="Supprimer toutes mes tâches"
          description="Toutes vos tâches et rappels seront supprimés, y compris les rendez-vous synchronisés avec Google Calendar."
          count={tasksCount}
          itemLabelSingular="tâche"
          itemLabelPlural="tâches"
          action={deleteAllMyTasks}
        />
        <DangerZoneAction
          title="Supprimer tous mes prospects"
          description="Tous vos prospects seront supprimés, ainsi que leurs tâches, notes et historique associés."
          count={prospectsCount}
          itemLabelSingular="prospect"
          itemLabelPlural="prospects"
          action={deleteAllMyProspects}
        />
      </div>
    </section>
  );
}
