/**
 * Page `/parametres/statuts` — gestion des statuts (CRUD + réordonnancement).
 *
 * Server Component qui charge les statuts puis rend le client interactif.
 */
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/session";
import { getUserStatuts, countAllProspectsForUser } from "@/lib/queries/prospects";
import { countAllTasksForUser } from "@/lib/queries/tasks";

import { StatutsManager } from "./_components/statuts-manager";
import { DangerZone } from "./_components/danger-zone";

export const metadata = { title: "Gestion des statuts" };

export default async function StatutsPage(): Promise<JSX.Element> {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");

  const [statuts, tasksCount, prospectsCount] = await Promise.all([
    getUserStatuts(session.user.id),
    countAllTasksForUser(session.user.id),
    countAllProspectsForUser(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Gestion des statuts
        </h1>
        <p className="text-sm text-muted-foreground">
          Personnalisez les étapes de votre pipeline commercial. Glissez-déposez
          pour réordonner.
        </p>
      </div>

      <StatutsManager initialStatuts={statuts} />

      <DangerZone tasksCount={tasksCount} prospectsCount={prospectsCount} />
    </div>
  );
}
