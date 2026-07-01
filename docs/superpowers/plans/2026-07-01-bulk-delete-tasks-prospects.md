# Suppression en masse (tâches / prospects) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter deux actions dans la page `/parametres/statuts` permettant à l'utilisateur connecté de supprimer définitivement toutes ses tâches, ou tous ses prospects (cascade sur leurs tâches/historique), avec une confirmation renforcée (saisie du mot "SUPPRIMER").

**Architecture:** Deux nouvelles Server Actions (`deleteAllMyTasks`, `deleteAllMyProspects`) suivant les conventions existantes (`requireSession()` → mutation Prisma → `revalidatePath`). Avant chaque suppression en masse, on notifie n8n (`notifyGcal`) pour chaque tâche RDV synchronisée, car la cascade Prisma ne déclenche pas de code applicatif. Un composant client réutilisable `DangerZoneAction` gère la confirmation (dialog + champ texte) et est utilisé deux fois dans une nouvelle section `DangerZone` sur la page paramètres.

**Tech Stack:** Next.js 14 (App Router), Prisma, TypeScript, Zod, shadcn/ui (Radix), Tailwind.

## Global Constraints

- Ce projet n'a **aucun framework de tests** (pas de jest/vitest configuré, aucun fichier `*.test.*`/`*.spec.*` dans le repo). La vérification de chaque tâche se fait via `npm run typecheck`, `npm run lint`, et une vérification manuelle finale dans le navigateur — pas de tests automatisés à écrire.
- Les deux actions sont **toujours scopées à `session.user.id`**, quel que soit le rôle (ADMIN/MANAGER inclus). Ce ne sont jamais des actions d'administration globale.
- Mot de confirmation : la chaîne littérale exacte `"SUPPRIMER"`. Vérifié **côté client uniquement** (garde-fou UX contre le clic accidentel, pas une frontière de sécurité — l'autorisation réelle vient de `requireSession()` côté serveur).
- Réutiliser les composants UI existants : `AlertDialog`, `Button`, `Input`, `useToast` (ne pas créer de nouveaux primitifs).
- Suivre les conventions existantes des Server Actions : `"use server"`, `requireSession()` en premier, retour `ActionResult<T>` (`{ ok: true, data } | { ok: false, error }`), `try/catch` avec `console.error("[nomAction]", error)` et message d'erreur en français.

---

### Task 1: Requêtes de comptage

**Files:**
- Modify: `lib/queries/tasks.ts`
- Modify: `lib/queries/prospects.ts`

**Interfaces:**
- Produces: `countAllTasksForUser(userId: string): Promise<number>`
- Produces: `countAllProspectsForUser(userId: string): Promise<number>`

- [ ] **Step 1: Ajouter `countAllTasksForUser` dans `lib/queries/tasks.ts`**

Ajouter à la fin du fichier (après `getRdvTasksForUser`, avant le `export { canViewAllTasks };` final) :

```ts
/** Nombre total de tâches assignées à l'utilisateur, tous statuts confondus. */
export async function countAllTasksForUser(userId: string): Promise<number> {
  return prisma.task.count({ where: { assignedUserId: userId } });
}
```

- [ ] **Step 2: Ajouter `countAllProspectsForUser` dans `lib/queries/prospects.ts`**

Ajouter à la fin du fichier (après `getUserTags`) :

```ts
/** Nombre total de prospects appartenant à l'utilisateur. */
export async function countAllProspectsForUser(userId: string): Promise<number> {
  return prisma.prospect.count({ where: { userId } });
}
```

- [ ] **Step 3: Vérifier la compilation TypeScript**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add lib/queries/tasks.ts lib/queries/prospects.ts
git commit -m "feat: add task/prospect count queries for bulk-delete feature"
```

---

### Task 2: Server Action `deleteAllMyTasks`

**Files:**
- Modify: `lib/actions/tasks.ts`

**Interfaces:**
- Consumes: `requireSession()` from `@/lib/session`; `notifyGcal` from `@/lib/gcal/notify`; `revalidateTaskPaths()` from `@/lib/tasks/revalidate`; `prisma` from `@/lib/prisma`; `ActionResult<T>` (already imported in this file from `@/lib/actions/prospects`)
- Produces: `deleteAllMyTasks(): Promise<ActionResult<{ count: number }>>`

- [ ] **Step 1: Ajouter l'import de `revalidatePath`**

En haut de `lib/actions/tasks.ts`, à côté des imports existants (après la ligne `import { z } from "zod";`), ajouter :

```ts
import { revalidatePath } from "next/cache";
```

- [ ] **Step 2: Ajouter la fonction `deleteAllMyTasks`**

Ajouter à la fin du fichier (après `postponeTask`) :

```ts
/**
 * Supprime définitivement toutes les tâches assignées à l'utilisateur courant.
 *
 * Notifie n8n pour chaque RDV synchronisé avant suppression : la cascade
 * Prisma ne déclenche aucun code applicatif, donc le nettoyage Google
 * Calendar doit être fait explicitement ici.
 */
export async function deleteAllMyTasks(): Promise<ActionResult<{ count: number }>> {
  const session = await requireSession();

  try {
    const rdvTasks = await prisma.task.findMany({
      where: {
        assignedUserId: session.user.id,
        type: "RDV",
        googleCalendarEventId: { not: null },
      },
      select: { id: true, googleCalendarEventId: true },
    });

    for (const task of rdvTasks) {
      notifyGcal({
        action: "delete",
        taskId: task.id,
        googleCalendarEventId: task.googleCalendarEventId,
      });
    }

    const { count } = await prisma.task.deleteMany({
      where: { assignedUserId: session.user.id },
    });

    revalidateTaskPaths();
    revalidatePath("/prospects/[id]", "page");
    return { ok: true, data: { count } };
  } catch (error) {
    console.error("[deleteAllMyTasks]", error);
    return { ok: false, error: "Impossible de supprimer les tâches" };
  }
}
```

- [ ] **Step 3: Vérifier la compilation TypeScript**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/tasks.ts
git commit -m "feat: add deleteAllMyTasks server action"
```

---

### Task 3: Server Action `deleteAllMyProspects`

**Files:**
- Modify: `lib/actions/prospects.ts`

**Interfaces:**
- Consumes: `requireSession()` from `@/lib/session`; `notifyGcal` from `@/lib/gcal/notify`; `prisma` from `@/lib/prisma`; `revalidatePath` from `next/cache` (déjà importé dans ce fichier)
- Produces: `deleteAllMyProspects(): Promise<ActionResult<{ count: number }>>`

- [ ] **Step 1: Étendre l'import Prisma avec `TaskType`**

Dans `lib/actions/prospects.ts`, remplacer la ligne d'import :

```ts
import { HistoriqueType, Prisma } from "@prisma/client";
```

par :

```ts
import { HistoriqueType, Prisma, TaskType } from "@prisma/client";
```

- [ ] **Step 2: Ajouter l'import de `notifyGcal`**

Juste après l'import de `prisma` (`import { prisma } from "@/lib/prisma";`), ajouter :

```ts
import { notifyGcal } from "@/lib/gcal/notify";
```

- [ ] **Step 3: Ajouter la fonction `deleteAllMyProspects`**

Ajouter à la fin du fichier (après `removeTagFromProspect`) :

```ts
// =====================================================================
// Suppression en masse de tous les prospects de l'utilisateur
// =====================================================================

/**
 * Supprime définitivement tous les prospects de l'utilisateur courant.
 *
 * Cascade Prisma : les tâches et l'historique liés sont supprimés
 * automatiquement (`onDelete: Cascade` dans le schéma). Comme cette
 * cascade ne déclenche aucun code applicatif, on notifie n8n pour
 * chaque RDV synchronisé avant la suppression.
 */
export async function deleteAllMyProspects(): Promise<ActionResult<{ count: number }>> {
  const session = await requireSession();

  try {
    const rdvTasks = await prisma.task.findMany({
      where: {
        prospect: { userId: session.user.id },
        type: TaskType.RDV,
        googleCalendarEventId: { not: null },
      },
      select: { id: true, googleCalendarEventId: true },
    });

    for (const task of rdvTasks) {
      notifyGcal({
        action: "delete",
        taskId: task.id,
        googleCalendarEventId: task.googleCalendarEventId,
      });
    }

    const { count } = await prisma.prospect.deleteMany({
      where: { userId: session.user.id },
    });

    revalidatePath("/prospects");
    revalidatePath("/prospects/[id]", "page");
    revalidatePath("/taches");
    revalidatePath("/agenda");
    revalidatePath("/dashboard");
    return { ok: true, data: { count } };
  } catch (error) {
    console.error("[deleteAllMyProspects]", error);
    return { ok: false, error: "Impossible de supprimer les prospects" };
  }
}
```

- [ ] **Step 4: Vérifier la compilation TypeScript**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/prospects.ts
git commit -m "feat: add deleteAllMyProspects server action"
```

---

### Task 4: Composant `DangerZoneAction`

**Files:**
- Create: `app/(dashboard)/parametres/statuts/_components/danger-zone-action.tsx`

**Interfaces:**
- Consumes: `ActionResult<T>` from `@/lib/actions/prospects`; `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogTrigger` from `@/components/ui/alert-dialog`; `Button` from `@/components/ui/button`; `Input` from `@/components/ui/input`; `useToast` from `@/hooks/use-toast`
- Produces: `DangerZoneAction` component, props:
  ```ts
  interface DangerZoneActionProps {
    title: string;
    description: string;
    count: number;
    itemLabelSingular: string;
    itemLabelPlural: string;
    action: () => Promise<ActionResult<{ count: number }>>;
  }
  ```

- [ ] **Step 1: Créer le fichier `danger-zone-action.tsx`**

```tsx
"use client";

/** Bouton d'action destructive en masse avec confirmation renforcée (mot à taper). */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { ActionResult } from "@/lib/actions/prospects";

const CONFIRM_WORD = "SUPPRIMER";

interface DangerZoneActionProps {
  title: string;
  description: string;
  count: number;
  itemLabelSingular: string;
  itemLabelPlural: string;
  action: () => Promise<ActionResult<{ count: number }>>;
}

export function DangerZoneAction({
  title,
  description,
  count,
  itemLabelSingular,
  itemLabelPlural,
  action,
}: DangerZoneActionProps): JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [confirmText, setConfirmText] = useState("");

  const label = (n: number): string => (n > 1 ? itemLabelPlural : itemLabelSingular);
  const canConfirm = confirmText === CONFIRM_WORD && count > 0;

  function handleDelete(): void {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast({
          variant: "success",
          title: "Suppression effectuée",
          description: `${result.data.count} ${label(result.data.count)} supprimé(s).`,
        });
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      }
    });
  }

  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!open) setConfirmText("");
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={count === 0}>
          <Trash2 className="mr-2 h-4 w-4" />
          {title}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title} ?</AlertDialogTitle>
          <AlertDialogDescription>
            {description} Cette action supprimera définitivement{" "}
            <strong>
              {count} {label(count)}
            </strong>{" "}
            et est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Tapez <strong>{CONFIRM_WORD}</strong> ci-dessous pour confirmer.
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_WORD}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!canConfirm || isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmer la suppression
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/parametres/statuts/_components/danger-zone-action.tsx"
git commit -m "feat: add reusable DangerZoneAction confirmation component"
```

---

### Task 5: Section `DangerZone` et intégration dans la page paramètres

**Files:**
- Create: `app/(dashboard)/parametres/statuts/_components/danger-zone.tsx`
- Modify: `app/(dashboard)/parametres/statuts/page.tsx`

**Interfaces:**
- Consumes: `DangerZoneAction` from `./danger-zone-action` (Task 4); `deleteAllMyTasks` from `@/lib/actions/tasks` (Task 2); `deleteAllMyProspects` from `@/lib/actions/prospects` (Task 3); `countAllTasksForUser`, `countAllProspectsForUser` from `@/lib/queries/tasks` et `@/lib/queries/prospects` (Task 1)
- Produces: `DangerZone` component, props `{ tasksCount: number; prospectsCount: number }`

- [ ] **Step 1: Créer le fichier `danger-zone.tsx`**

```tsx
/** Section "Zone dangereuse" — actions de suppression en masse (tâches / prospects). */
import { deleteAllMyProspects } from "@/lib/actions/prospects";
import { deleteAllMyTasks } from "@/lib/actions/tasks";

import { DangerZoneAction } from "./danger-zone-action";

interface DangerZoneProps {
  tasksCount: number;
  prospectsCount: number;
}

export function DangerZone({ tasksCount, prospectsCount }: DangerZoneProps): JSX.Element {
  return (
    <section className="space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
      <div>
        <h2 className="text-lg font-semibold text-destructive">Zone dangereuse</h2>
        <p className="text-sm text-muted-foreground">
          Ces actions sont irréversibles et suppriment définitivement vos données.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <DangerZoneAction
          title="Supprimer toutes mes tâches"
          description="Toutes vos tâches et rappels seront supprimés, y compris les rendez-vous synchronisés avec Google Calendar."
          count={tasksCount}
          itemLabelSingular="tâche"
          itemLabelPlural="tâches"
          action={deleteAllMyTasks}
        />
        <DangerZoneAction
          title="Supprimer tous mes prospects"
          description="Tous vos prospects seront supprimés, ainsi que leurs tâches, notes et historique associés."
          count={prospectsCount}
          itemLabelSingular="prospect"
          itemLabelPlural="prospects"
          action={deleteAllMyProspects}
        />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Modifier `app/(dashboard)/parametres/statuts/page.tsx`**

Remplacer le contenu du fichier par :

```tsx
/**
 * Page `/parametres/statuts` — gestion des statuts (CRUD + réordonnancement).
 *
 * Server Component qui charge les statuts puis rend le client interactif.
 */
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/session";
import { getUserStatuts, countAllProspectsForUser } from "@/lib/queries/prospects";
import { countAllTasksForUser } from "@/lib/queries/tasks";

import { StatutsManager } from "./_components/statuts-manager";
import { DangerZone } from "./_components/danger-zone";

export const metadata = { title: "Gestion des statuts" };

export default async function StatutsPage(): Promise<JSX.Element> {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");

  const [statuts, tasksCount, prospectsCount] = await Promise.all([
    getUserStatuts(session.user.id),
    countAllTasksForUser(session.user.id),
    countAllProspectsForUser(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Gestion des statuts
        </h1>
        <p className="text-sm text-muted-foreground">
          Personnalisez les étapes de votre pipeline commercial. Glissez-déposez
          pour réordonner.
        </p>
      </div>

      <StatutsManager initialStatuts={statuts} />

      <DangerZone tasksCount={tasksCount} prospectsCount={prospectsCount} />
    </div>
  );
}
```

- [ ] **Step 3: Vérifier la compilation TypeScript et le lint**

Run: `npm run typecheck`
Expected: aucune erreur.

Run: `npm run lint`
Expected: `✔ No ESLint warnings or errors`

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/parametres/statuts/_components/danger-zone.tsx" "app/(dashboard)/parametres/statuts/page.tsx"
git commit -m "feat: wire DangerZone section into settings page"
```

---

### Task 6: Vérification manuelle end-to-end

**Files:** aucun (vérification uniquement, pas de code).

- [ ] **Step 1: Lancer le build de production**

Run: `npm run build`
Expected: build réussi, aucune erreur TypeScript/ESLint bloquante.

- [ ] **Step 2: Lancer le serveur de dev**

Run: `npm run dev`

- [ ] **Step 3: Vérifier l'état initial de la page**

Dans le navigateur, se connecter puis aller sur `/parametres/statuts`. Vérifier :
- La section "Zone dangereuse" apparaît sous la gestion des statuts.
- Les deux boutons affichent le bon nombre d'éléments dans le dialogue (ouvrir chaque dialogue pour vérifier le texte "X tâches" / "X prospects").
- Si le compte est à 0, le bouton correspondant est désactivé.

- [ ] **Step 4: Vérifier le garde-fou de confirmation**

Ouvrir le dialogue "Supprimer toutes mes tâches" (en ayant au moins une tâche existante). Taper un mot incorrect dans le champ : le bouton "Confirmer la suppression" doit rester désactivé. Taper exactement `SUPPRIMER` : le bouton doit devenir actif.

- [ ] **Step 5: Vérifier la suppression des tâches**

Cliquer sur "Confirmer la suppression". Vérifier :
- Un toast de succès apparaît avec le nombre de tâches supprimées.
- La page `/taches` ne montre plus aucune tâche.
- Si une tâche RDV avec `googleCalendarEventId` existait, vérifier dans les logs serveur (`console.log`/n8n) qu'un appel `notifyGcal` de type `delete` a bien été émis pour chacune.
- Le bouton "Supprimer toutes mes tâches" est maintenant désactivé (0 restant).

- [ ] **Step 6: Vérifier la suppression des prospects**

Recréer un prospect avec au moins une tâche associée, puis répéter la même vérification pour "Supprimer tous mes prospects" : toast de succès, `/prospects` vide, prospect + tâche + historique bien supprimés en base (vérifier via `npm run prisma:studio` ou une requête SQL rapide que les lignes `Task`/`HistoriqueAction` liées ont disparu).

- [ ] **Step 7: Confirmer qu'aucune régression n'affecte les autres pages**

Vérifier que `/dashboard` et `/agenda` se chargent normalement (sans erreur) après les deux suppressions en masse.
