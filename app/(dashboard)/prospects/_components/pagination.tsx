"use client";

/** Pagination de la liste des prospects, pilotée par le paramètre d'URL `?page=`. */
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export function Pagination({
  currentPage,
  totalPages,
}: PaginationProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goTo(page: number): void {
    const params = new URLSearchParams(searchParams.toString());
    // Page 1 = état par défaut : on retire le paramètre pour garder une URL propre.
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const url: string = `${pathname}?${params.toString()}`;
    router.push(url as Parameters<typeof router.push>[0]);
  }

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => goTo(currentPage - 1)}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Précédent
      </Button>

      <span className="text-sm text-muted-foreground">
        Page {currentPage} / {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => goTo(currentPage + 1)}
      >
        Suivant
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}
