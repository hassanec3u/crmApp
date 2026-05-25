/**
 * Barre de compteurs résumés en haut du dashboard.
 */
import { Users, TrendingUp, AlertTriangle, CalendarDays } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { DashboardStats } from "@/lib/queries/dashboard";

interface StatsBarProps {
  stats: DashboardStats;
}

const STAT_ITEMS = [
  {
    key: "prospectsActifs" as const,
    label: "Prospects actifs",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    key: "leadsThisWeek" as const,
    label: "Leads cette semaine",
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    key: "tachesEnRetard" as const,
    label: "Tâches en retard",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  {
    key: "rdvThisWeek" as const,
    label: "RDV cette semaine",
    icon: CalendarDays,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
];

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {STAT_ITEMS.map((item) => (
        <Card key={item.key}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`rounded-lg p-2 ${item.bgColor}`}>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{stats[item.key]}</p>
              <p className="truncate text-xs text-muted-foreground">
                {item.label}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
