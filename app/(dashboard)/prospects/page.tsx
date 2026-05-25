/**
 * Page `/prospects` — liste paginée avec recherche, filtres et tri.
 *
 * Server Component : fetch initial côté serveur, puis les interactions
 * (recherche, filtre, pagination) se font via les searchParams de l'URL.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import {
  getProspects,
  getUserStatuts,
  getUserTags,
} from "@/lib/queries/prospects";
import type { ProspectSort } from "@/lib/constants";

import { ProspectFilters } from "./_components/prospect-filters";
import { ProspectTable } from "./_components/prospect-table";
import { Pagination } from "./_components/pagination";

interface PageProps {
  searchParams: {
    q?: string;
    statut?: string;
    tag?: string;
    source?: string;
    sort?: ProspectSort;
    page?: string;
  };
}

export const metadata = { title: "Prospects" };

export default async function ProspectsPage({
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");

  const userId = session.user.id;

  const [result, statuts, tags] = await Promise.all([
    getProspects({
      userId,
      search: searchParams.q,
      statutId: searchParams.statut,
      tagId: searchParams.tag,
      source: searchParams.source,
      sort: searchParams.sort,
      page: searchParams.page ? parseInt(searchParams.page, 10) : 1,
    }),
    getUserStatuts(userId),
    getUserTags(userId),
  ]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prospects</h1>
          <p className="text-sm text-muted-foreground">
            {result.total} prospect{result.total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/prospects/nouveau">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau prospect
          </Link>
        </Button>
      </div>

      {/* Filtres */}
      <ProspectFilters statuts={statuts} tags={tags} />

      {/* Tableau / liste */}
      <ProspectTable items={result.items} />

      {/* Pagination */}
      {result.totalPages > 1 && (
        <Pagination
          currentPage={result.page}
          totalPages={result.totalPages}
        />
      )}
    </div>
  );
}
