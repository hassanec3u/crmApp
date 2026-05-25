"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "Configuration invalide côté serveur. Contactez l'administrateur.",
  AccessDenied: "Accès refusé.",
  CredentialsSignin: "Email ou mot de passe incorrect.",
  default: "Une erreur est survenue lors de la connexion.",
};

function ErrorContent(): JSX.Element {
  const params = useSearchParams();
  const error = params.get("error") ?? "default";
  const message = ERROR_MESSAGES[error] ?? ERROR_MESSAGES["default"]!;

  return (
    <div className="max-w-sm space-y-4 text-center">
      <h1 className="text-xl font-semibold text-destructive">
        Connexion impossible
      </h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Link
        href="/login"
        className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Réessayer
      </Link>
    </div>
  );
}

export default function LoginErrorPage(): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Chargement...</p>
        }
      >
        <ErrorContent />
      </Suspense>
    </main>
  );
}
