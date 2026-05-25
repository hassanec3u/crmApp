/**
 * Helpers serveur autour de NextAuth.
 *
 * Importable uniquement depuis du code serveur (Server Components,
 * Route Handlers, Server Actions).
 */
import { getServerSession, type Session } from "next-auth";

import { authOptions } from "@/lib/auth";

/** Retourne la session actuelle ou `null`. */
export function getServerAuthSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

/**
 * Garde-fou : impose une session valide.
 * Lance une erreur si l'utilisateur n'est pas authentifié — utile dans
 * les Server Actions où `redirect()` n'est pas toujours souhaité.
 */
export async function requireSession(): Promise<Session> {
  const session = await getServerAuthSession();
  if (!session?.user) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}
