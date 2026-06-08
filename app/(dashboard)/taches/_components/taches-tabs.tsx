"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskTab } from "@/lib/queries/tasks";

/** Onglets de filtrage des tâches, affichés dans l'ordre avec leur compteur. */
const TABS: { id: TaskTab; label: string }[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "overdue", label: "En retard" },
  { id: "upcoming", label: "À venir" },
  { id: "done", label: "Terminés" },
];

interface TachesTabsProps {
  counts: Record<TaskTab, number>;
  activeTab: TaskTab;
}

export function TachesTabs({ counts, activeTab }: TachesTabsProps): JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
      aria-label="Filtres des tâches"
    >
      {TABS.map((tab) => {
        // Conserve le filtre de portée (`scope`) actif lors du changement d'onglet.
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab.id);
        const scope = searchParams.get("scope");
        if (scope) params.set("scope", scope);
        const href = `${pathname}?${params.toString()}`;
        const count = counts[tab.id];
        const isActive = activeTab === tab.id;

        return (
          <Link
            key={tab.id}
            href={href as Parameters<typeof Link>[0]["href"]}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            {tab.label}
            {count > 0 && (
              <Badge
                variant={isActive ? "secondary" : "outline"}
                className={cn(
                  "h-5 min-w-5 justify-center px-1.5 text-[10px]",
                  isActive && "bg-primary-foreground/20 text-primary-foreground",
                )}
              >
                {count}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
