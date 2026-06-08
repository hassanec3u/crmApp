/**
 * Page Tâches — liste centralisée des rappels (aujourd'hui, retard, à venir, terminés).
 */
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";

import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { resolveTaskScope } from "@/lib/tasks/access";
import { requireSession } from "@/lib/session";
import {
  canViewAllTasks,
  getTaskTabCounts,
  getTasksForTab,
  type TaskTab,
} from "@/lib/queries/tasks";
import { getAssignableUsers } from "@/lib/queries/users";

import { TachesList } from "./_components/taches-list";
import { TachesScopeFilter } from "./_components/taches-scope-filter";
import { TachesTabs } from "./_components/taches-tabs";

export const metadata = { title: "Tâches" };

const VALID_TABS: TaskTab[] = ["today", "overdue", "upcoming", "done"];

function parseTab(value: string | undefined): TaskTab {
  if (value && VALID_TABS.includes(value as TaskTab)) {
    return value as TaskTab;
  }
  return "today";
}

interface PageProps {
  searchParams: { tab?: string; scope?: string };
}

export default async function TachesPage({
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");

  const tab = parseTab(searchParams.tab);
  const scope = resolveTaskScope(searchParams.scope, session.user.role);
  const userId = session.user.id;
  const showTeam = canViewAllTasks(session.user.role);
  const showAssignee = showTeam && scope === "all";

  const [tasks, counts, users] = await Promise.all([
    getTasksForTab(userId, tab, scope, session.user.role),
    getTaskTabCounts(userId, scope, session.user.role),
    getAssignableUsers(),
  ]);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold md:text-2xl">
            <Bell className="h-6 w-6 text-primary" />
            Tâches
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rappels et actions liés à vos prospects
          </p>
        </div>
        <TachesScopeFilter activeScope={scope} canViewAll={showTeam} />
      </div>

      <TachesTabs counts={counts} activeTab={tab} />

      <TachesList
        tasks={tasks}
        tab={tab}
        users={users}
        currentUserId={userId}
        showAssignee={showAssignee}
      />

      <CreateTaskDialog
        users={users}
        currentUserId={userId}
        showAssignee={showTeam}
      />
    </div>
  );
}
