/**
 * Fiche prospect `/prospects/[id]` — vue complète.
 *
 * Server Component : charge les données puis rend les sections client
 * interactives (changement de statut, notes, tags, rappels, timeline).
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import {
  getProspectById,
  getUserStatuts,
  getUserTags,
} from "@/lib/queries/prospects";

import { ProspectHeader } from "./_components/prospect-header";
import { ProspectStatutSelect } from "./_components/prospect-statut-select";
import { ProspectCriteres } from "./_components/prospect-criteres";
import { ProspectNotes } from "./_components/prospect-notes";
import { ProspectTags } from "./_components/prospect-tags";
import { ProspectTasks } from "./_components/prospect-tasks";
import { ProspectTimeline } from "./_components/prospect-timeline";
import { ProspectAddNote } from "./_components/prospect-add-note";
import { ProspectDeleteButton } from "./_components/prospect-delete-button";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps) {
  return { title: `Prospect ${params.id.slice(0, 8)}` };
}

export default async function ProspectPage({
  params,
}: PageProps): Promise<JSX.Element> {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");

  const [prospect, statuts, tags] = await Promise.all([
    getProspectById(params.id, session.user.id),
    getUserStatuts(session.user.id),
    getUserTags(session.user.id),
  ]);

  if (!prospect) notFound();

  return (
    <div className="space-y-6">
      {/* Retour + actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/prospects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/prospects/${prospect.id}/modifier`}>
              <Pencil className="mr-2 h-3 w-3" />
              Modifier
            </Link>
          </Button>
          <ProspectDeleteButton prospectId={prospect.id} nom={prospect.nom} />
        </div>
      </div>

      {/* En-tête */}
      <ProspectHeader prospect={prospect} />

      {/* Changement de statut rapide */}
      <ProspectStatutSelect
        prospectId={prospect.id}
        currentStatutId={prospect.statutId}
        statuts={statuts}
      />

      {/* Grille de sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Colonne gauche */}
        <div className="space-y-6">
          <ProspectCriteres criteres={prospect.criteres} />
          <ProspectNotes
            prospectId={prospect.id}
            notes={prospect.notes}
          />
          <ProspectTags
            prospectId={prospect.id}
            currentTags={prospect.tags}
            allTags={tags}
          />
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">
          <ProspectTasks
            prospectId={prospect.id}
            tasks={prospect.tasks}
          />
          <ProspectAddNote prospectId={prospect.id} />
          <ProspectTimeline historiques={prospect.historiques} />
        </div>
      </div>
    </div>
  );
}
