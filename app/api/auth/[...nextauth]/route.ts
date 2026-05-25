/**
 * Route handler NextAuth — App Router.
 *
 * NextAuth fournit un handler universel qu'on expose en GET et POST.
 * Toute la configuration vit dans `lib/auth.ts` afin d'être réutilisable
 * côté serveur (ex. `getServerSession(authOptions)`).
 */
import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
