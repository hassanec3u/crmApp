/**
 * Page `/prospects/nouveau` — création d'un prospect.
 *
 * Server Component qui charge les statuts / tags puis rend le
 * formulaire client.
 */
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/session";
import { getUserStatuts, getUserTags } from "@/lib/queries/prospects";
import { ProspectForm } from "../_components/prospect-form";

export const metadata = { title: "Nouveau prospect" };

export default async function NouveauProspectPage(): Promise<JSX.Element> {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");

  const [statuts, tags] = await Promise.all([
    getUserStatuts(session.user.id),
    getUserTags(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nouveau prospect</h1>
        <p className="text-sm text-muted-foreground">
          Remplissez les informations ci-dessous pour ajouter un prospect.
        </p>
      </div>

      <ProspectForm statuts={statuts} tags={tags} />
    </div>
  );
}
