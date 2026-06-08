"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import type { TaskScope } from "@/lib/constants/tasks";

/** Bascule "mes tâches / toute l'équipe", visible uniquement pour admin/manager. */
interface TachesScopeFilterProps {
  activeScope: TaskScope;
  canViewAll: boolean;
}

export function TachesScopeFilter({
  activeScope,
  canViewAll,
}: TachesScopeFilterProps): JSX.Element | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!canViewAll) return null;

  const options: { id: TaskScope; label: string }[] = [
    { id: "mine", label: "Mes tâches" },
    { id: "all", label: "Toute l'équipe" },
  ];

  return (
    <div className="flex gap-2">
      {options.map((opt) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("scope", opt.id);
        const href = `${pathname}?${params.toString()}`;

        return (
          <Link
            key={opt.id}
            href={href as Parameters<typeof Link>[0]["href"]}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              activeScope === opt.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted",
            )}
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}
