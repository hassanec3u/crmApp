"use client";

/**
 * Wrapper client autour de `SessionProvider` de NextAuth.
 *
 * Le `SessionProvider` doit être un composant client. On l'isole ici
 * afin de garder le layout racine en composant serveur.
 */
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  return <SessionProvider>{children}</SessionProvider>;
}
