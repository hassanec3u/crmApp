/**
 * En-tête du dashboard : "Bonjour [prénom]" + date du jour + bouton actualiser.
 */
"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  userName: string | null | undefined;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const firstName = userName?.split(" ")[0] ?? "Utilisateur";
  const today = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">
          Bonjour {firstName} 👋
        </h1>
        <p className="text-sm capitalize text-muted-foreground">{today}</p>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => startTransition(() => router.refresh())}
        disabled={isPending}
        className="mt-2 w-fit sm:mt-0"
      >
        <RefreshCw
          className={cn("mr-2 h-4 w-4", isPending && "animate-spin")}
        />
        Actualiser
      </Button>
    </div>
  );
}
