/**
 * Page Dashboard — point d'entrée après connexion.
 *
 * Charge toutes les données côté serveur (Server Components) et
 * les distribue aux widgets enfants.
 */
import { getServerAuthSession } from "@/lib/session";
import {
  getLeadsDuJour,
  getRappelsDuJour,
  getTachesUrgentes,
  getRendezVous,
  getProspectsARelancer,
  getDashboardStats,
} from "@/lib/queries/dashboard";
import { getPrioritesIA } from "@/lib/queries/ai-priorities";

import { DashboardHeader } from "./_components/dashboard-header";
import { StatsBar } from "./_components/stats-bar";
import { LeadsToday } from "./_components/leads-today";
import { RemindersToday } from "./_components/reminders-today";
import { UrgentTasks } from "./_components/urgent-tasks";
import { UpcomingAppointments } from "./_components/upcoming-appointments";
import { ProspectsToFollowUp } from "./_components/prospects-to-follow-up";
import { AiPriorities } from "./_components/ai-priorities";

export default async function DashboardPage(): Promise<JSX.Element> {
  const session = await getServerAuthSession();
  const userId = session!.user.id;

  // Chargement parallèle de toutes les données du dashboard
  const [leads, reminders, urgentTasks, appointments, prospectsRelance, stats, priorites] =
    await Promise.all([
      getLeadsDuJour(userId),
      getRappelsDuJour(userId),
      getTachesUrgentes(userId),
      getRendezVous(userId),
      getProspectsARelancer(userId),
      getDashboardStats(userId),
      getPrioritesIA(userId),
    ]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <DashboardHeader userName={session!.user.name} />

      {/* Compteurs résumés */}
      <StatsBar stats={stats} />

      {/* Grille de widgets */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Colonne gauche */}
        <div className="space-y-6">
          <AiPriorities priorites={priorites} />
          <RemindersToday reminders={reminders} />
          <UrgentTasks tasks={urgentTasks} />
          <ProspectsToFollowUp prospects={prospectsRelance} />
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">
          <LeadsToday leads={leads} />
          <UpcomingAppointments appointments={appointments} />
        </div>
      </div>
    </div>
  );
}
