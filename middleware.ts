/**
 * Middleware d'authentification.
 *
 * Nécessite `session.strategy: "jwt"` dans lib/auth.ts (le middleware
 * NextAuth ne gère pas les sessions "database").
 *
 * Routes protégées → redirection vers /login si pas de JWT valide.
 */
export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Protège toutes les routes SAUF :
     *  - /login, /login/*
     *  - /api/auth/* (callback NextAuth)
     *  - assets statiques (_next, favicon, images publiques)
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
