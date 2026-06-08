/**
 * Page Agenda — vue jour / semaine des tâches.
 */
import { redirect } from "next/navigation";
import { Calendar } from "lucide-react";
import { endOfWeek, parseISO, startOfDay, startOfWeek } from "date-fns";

import { resolveTaskScope } from "@/lib/tasks/access";
import { requireSession } from "@/lib/session";
import { canViewAllTasks, getTasksInRange } from "@/lib/queries/tasks";
import { getAssignableUsers } from "@/lib/queries/users";
import { formatDateForInput } from "@/lib/format";

import { AgendaView } from "./_components/agenda-view";

export const metadata = { title: "Agenda" };

type AgendaViewMode = "day" | "week";

/** Lit le mode d'affichage depuis l'URL (`?view=`), retombe sur "day" si absent/invalide. */
function parseView(value: string | undefined): AgendaViewMode {
  return value === "week" ? "week" : "day";
}

/** Lit la date d'ancrage depuis l'URL (`?date=`), retombe sur aujourd'hui si absente/invalide. */
function parseDate(value: string | undefined): Date {
  if (!value) return startOfDay(new Date());
  try {
    const d = parseISO(value);
    return startOfDay(Number.isNaN(d.getTime()) ? new Date() : d);
  } catch {
    return startOfDay(new Date());
  }
}

interface PageProps {
  searchParams: { view?: string; date?: string; scope?: string };
}

export default async function AgendaPage({
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");

  const view = parseView(searchParams.view);
  const anchor = parseDate(searchParams.date);
  const scope = resolveTaskScope(searchParams.scope, session.user.role);
  const userId = session.user.id;
  const showTeam = canViewAllTasks(session.user.role);

  // En vue semaine, on charge toute la semaine (lundi → dimanche) ; en
  // vue jour, uniquement la journée ancrée.
  const rangeStart =
    view === "week"
      ? startOfWeek(anchor, { weekStartsOn: 1 })
      : anchor;
  const rangeEnd =
    view === "week"
      ? endOfWeek(anchor, { weekStartsOn: 1 })
      : anchor;

  const [tasks, users] = await Promise.all([
    getTasksInRange(
      userId,
      scope,
      session.user.role,
      rangeStart,
      rangeEnd,
      true,
    ),
    getAssignableUsers(),
  ]);

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold md:text-2xl">
          <Calendar className="h-6 w-6 text-primary" />
          Agenda
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rappels et rendez-vous planifiés
        </p>
      </div>

      <AgendaView
        tasks={tasks.map((t) => ({
          ...t,
          date: t.date.toISOString(),
        }))}
        view={view}
        anchorDate={formatDateForInput(anchor)}
        scope={scope}
        canViewAll={showTeam}
        users={users}
        currentUserId={userId}
        showAssignee={showTeam && scope === "all"}
      />
    </div>
  );
}
