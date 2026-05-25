/**
 * Client Prisma singleton.
 *
 * En développement, Next.js recharge le module à chaque modification ce
 * qui multiplie les instances de PrismaClient (et donc les connexions).
 * On stocke l'instance dans `globalThis` pour la réutiliser.
 *
 * Référence : https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
 */
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
