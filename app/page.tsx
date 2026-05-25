/**
 * Page d'accueil (route `/`).
 *
 * Redirige vers `/dashboard` si l'utilisateur est connecté, vers
 * `/login` sinon. Le middleware fait déjà le travail mais on garde une
 * porte d'entrée explicite.
 */
import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/lib/session";

export default async function HomePage(): Promise<never> {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/login");
  }

  redirect("/dashboard");
}
