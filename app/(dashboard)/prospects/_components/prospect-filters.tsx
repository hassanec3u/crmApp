"use client";

/**
 * Barre de recherche et filtres de la liste des prospects.
 *
 * Tous les filtres sont reflétés dans les paramètres d'URL (recherche
 * différée 400 ms, statut, source, tri…) afin de rester partageables
 * et de permettre le rendu serveur de la liste filtrée.
 */
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROSPECT_SORT_OPTIONS, PROSPECT_SOURCES } from "@/lib/constants";

interface FilterProps {
  statuts: { id: string; label: string; couleur: string }[];
  tags: { id: string; label: string; couleur: string }[];
}

export function ProspectFilters({ statuts, tags }: FilterProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  /** Met à jour (ou retire) un paramètre de filtre dans l'URL et revient à la page 1. */
  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 on filter change
      params.delete("page");
      const url: string = `${pathname}?${params.toString()}`;
      startTransition(() => {
        router.push(url as Parameters<typeof router.push>[0]);
      });
    },
    [router, pathname, searchParams],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams("q", query.trim() || null);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, updateParams]);

  const hasFilters =
    searchParams.has("q") ||
    searchParams.has("statut") ||
    searchParams.has("tag") ||
    searchParams.has("source") ||
    searchParams.has("sort");

  function clearAll(): void {
    setQuery("");
    startTransition(() => {
      router.push(pathname as Parameters<typeof router.push>[0]);
    });
  }

  return (
    <div className="space-y-3">
      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Rechercher un prospect (nom, tel, email)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filtres en ligne */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Statut */}
        <Select
          value={searchParams.get("statut") ?? "all"}
          onValueChange={(v) => updateParams("statut", v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {statuts.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: s.couleur }}
                  />
                  {s.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tag */}
        <Select
          value={searchParams.get("tag") ?? "all"}
          onValueChange={(v) => updateParams("tag", v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les tags</SelectItem>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source */}
        <Select
          value={searchParams.get("source") ?? "all"}
          onValueChange={(v) => updateParams("source", v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les sources</SelectItem>
            {PROSPECT_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tri */}
        <Select
          value={searchParams.get("sort") ?? "createdAt-desc"}
          onValueChange={(v) => updateParams("sort", v)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Trier par" />
          </SelectTrigger>
          <SelectContent>
            {PROSPECT_SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Reset */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="mr-1 h-3 w-3" />
            Réinitialiser
          </Button>
        )}
      </div>
    </div>
  );
}
