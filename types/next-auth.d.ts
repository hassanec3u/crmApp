/**
 * Augmentation des types NextAuth.
 *
 * Permet d'avoir `session.user.id` et `session.user.role` typés
 * partout dans le code (composants serveur, API routes, hooks).
 */
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
