/**
 * Layout partagé de la zone connectée (dashboard).
 *
 * Gère la redirection si non connecté et affiche la navigation
 * latérale (desktop) / bottom bar (mobile).
 */
import { redirect } from "next/navigation";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { getServerAuthSession } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <SidebarNav userName={session.user.name} />

      {/* Zone contenu : décalée à gauche par la sidebar sur desktop, padding bottom pour la bottom bar mobile */}
      <main className="flex-1 overflow-y-auto pb-20 md:ml-64 md:pb-0">
        <div className="container max-w-6xl px-4 py-4 md:px-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
