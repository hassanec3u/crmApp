/**
 * Page `/prospects/[id]/modifier` — édition d'un prospect existant.
 *
 * Charge les données actuelles du prospect puis les passe au
 * formulaire partagé en mode édition.
 */
import { notFound, redirect } from "next/navigation";

import { requireSession } from "@/lib/session";
import {
  getProspectById,
  getUserStatuts,
  getUserTags,
} from "@/lib/queries/prospects";
import type { ProspectCriteres } from "@/types/prospect";
import { ProspectForm } from "../../_components/prospect-form";

interface PageProps {
  params: { id: string };
}

export const metadata = { title: "Modifier le prospect" };

export default async function ModifierProspectPage({
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

  const criteres = (prospect.criteres as ProspectCriteres | null) ?? undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Modifier : {prospect.prenom ? `${prospect.prenom} ` : ""}{prospect.nom}
        </h1>
        <p className="text-sm text-muted-foreground">
          Mettez à jour les informations du prospect.
        </p>
      </div>

      <ProspectForm
        isEdit
        statuts={statuts}
        tags={tags}
        defaultValues={{
          id: prospect.id,
          nom: prospect.nom,
          prenom: prospect.prenom ?? "",
          telephone: prospect.telephone ?? "",
          email: prospect.email ?? "",
          source: (prospect.source ?? "") as "" | "Figaro" | "Bouche à oreille" | "Site web" | "Autre",
          statutId: prospect.statutId ?? "",
          notes: prospect.notes ?? "",
          tagIds: prospect.tags.map((t) => t.id),
          criteres,
        }}
      />
    </div>
  );
}
