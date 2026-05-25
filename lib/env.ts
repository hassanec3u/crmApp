/**
 * Validation des variables d'environnement avec zod.
 *
 * Importer ce module au bootstrap garantit un fail-fast clair si une
 * variable critique est manquante (au lieu d'une erreur cryptique à
 * l'exécution).
 */
import { z } from "zod";

const envSchema = z.object({
  // Application
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16, "NEXTAUTH_SECRET doit faire au moins 16 caractères"),

  // Base de données
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // Supabase (optionnel — utile pour Storage / Realtime)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Seed
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_NAME: z.string().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(6).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Variables d'environnement invalides :\n",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Configuration d'environnement invalide. Vérifier le .env");
}

export const env = parsed.data;
