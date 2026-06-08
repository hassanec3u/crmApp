/** Requêtes serveur autour des utilisateurs (collaborateurs assignables). */
import { prisma } from "@/lib/prisma";

export interface AssignableUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

/** Utilisateurs pouvant recevoir une tâche (tous les comptes actifs). */
export async function getAssignableUsers(): Promise<AssignableUser[]> {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}
