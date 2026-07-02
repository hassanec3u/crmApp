# IA Commerciale — Priorités du jour — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher sur le dashboard une section "Priorités IA du jour" qui classe chaque prospect actif Chaud/Tiède/Froid avec une raison, calculée par Claude via n8n (cron quotidien + bouton "Actualiser").

**Architecture:** Le CRM expose uniquement deux endpoints Bearer-secured (`GET /api/ai/export`, `POST /api/ai/priorities/callback`) et un webhook sortant fire-and-forget (`notifyAiRefresh`). Toute l'orchestration (planification, prompt, appel Claude Haiku) vit dans n8n — même pattern que la synchro Google Calendar déjà en place (`lib/gcal/notify.ts`, `app/api/tasks/[id]/gcal/route.ts`).

**Tech Stack:** Next.js 14 App Router, Prisma 5, PostgreSQL (Supabase), n8n (Anthropic Claude Haiku node), zod, shadcn/ui.

## Global Constraints

- Next.js 14 App Router — pas de Pages Router.
- Server Actions avec `"use server"` — pas de route API pour les mutations internes au CRM (les deux routes API créées ici sont uniquement pour n8n, authentifiées par Bearer token, pas par session).
- Prisma 5 — migrations via `npx prisma migrate dev`.
- TypeScript strict — `npm run typecheck` après chaque tâche, aucune erreur.
- Pas de test runner configuré — vérification par typecheck + tests manuels curl + Prisma Studio, comme pour la synchro GCal existante.
- Aucune clé/SDK Anthropic dans le CRM. Le modèle IA (`claude-haiku-4-5`) est appelé uniquement depuis n8n.
- `N8N_AI_WEBHOOK_URL` absent → `notifyAiRefresh` ne fait rien (dégradation silencieuse, pas d'erreur, pas de crash).
- Réutiliser `N8N_WEBHOOK_SECRET` et `CRM_URL` existants — ne pas créer de nouveau secret.
- Ne jamais committer `.env` (déjà dans `.gitignore`).
- Dashboard scopé à l'agent connecté (`session.user.id`) — pas de vue cross-agents, cohérent avec le reste du dashboard.

---

## Carte des fichiers

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `prisma/schema.prisma` | Modifier | Ajouter `enum PriorityScore` + modèle `ProspectPriority` + relation sur `Prospect` |
| `lib/constants/statuts.ts` | Créer | Constante partagée `STATUTS_FINAUX` |
| `lib/queries/dashboard.ts` | Modifier | Utiliser `STATUTS_FINAUX` au lieu du tableau dupliqué |
| `lib/queries/ai-export.ts` | Créer | Requête d'export des prospects actifs pour n8n |
| `app/api/ai/export/route.ts` | Créer | `GET` Bearer-secured, consommé par n8n |
| `app/api/ai/priorities/callback/route.ts` | Créer | `POST` Bearer-secured, upsert `ProspectPriority` |
| `middleware.ts` | Modifier | Exclure les deux nouvelles routes de l'auth par session |
| `lib/ai/notify.ts` | Créer | `notifyAiRefresh(userId)` fire-and-forget vers n8n |
| `lib/actions/ai.ts` | Créer | Server Action `refreshAiPriorities()` |
| `lib/queries/ai-priorities.ts` | Créer | `getPrioritesIA(userId)` — top 10 pour le dashboard |
| `app/(dashboard)/dashboard/_components/ai-priorities.tsx` | Créer | Section dashboard "Priorités IA du jour" |
| `app/(dashboard)/dashboard/page.tsx` | Modifier | Intégrer la nouvelle section |
| `.env.example` | Modifier | Documenter `N8N_AI_WEBHOOK_URL` |
| `docs/n8n/crm-ai-priorities-workflow.json` | Créer | Workflow n8n importable |

---

## Task 1 : Migration Prisma — `ProspectPriority`

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: modèle `ProspectPriority` (`id`, `prospectId` unique, `score: PriorityScore`, `raison: string`, `computedAt: DateTime`) disponible dans Prisma Client. Enum `PriorityScore = CHAUD | TIEDE | FROID`.

- [ ] **Step 1 : Ajouter l'enum et le modèle dans `schema.prisma`**

Ouvrir `prisma/schema.prisma`. Ajouter l'enum juste après `enum HistoriqueType` (autour de la ligne 55) :

```prisma
/// Score de priorité commerciale calculé par l'IA pour un prospect.
enum PriorityScore {
  CHAUD
  TIEDE
  FROID
}
```

Ajouter le modèle juste après le modèle `HistoriqueAction` (fin de fichier) :

```prisma
/// Priorité commerciale calculée par l'IA (n8n + Claude) pour un prospect.
/// Une ligne par prospect : le calcul du jour écrase le précédent.
model ProspectPriority {
  id         String        @id @default(cuid())
  prospectId String        @unique
  prospect   Prospect      @relation(fields: [prospectId], references: [id], onDelete: Cascade)
  score      PriorityScore
  raison     String        @db.Text
  computedAt DateTime      @default(now())

  @@index([score, computedAt])
}
```

Ajouter la relation inverse sur le modèle `Prospect` (dans le bloc `tasks Task[]` / `historiques HistoriqueAction[]`) :

```prisma
  tasks       Task[]
  historiques HistoriqueAction[]
  priority    ProspectPriority?
```

- [ ] **Step 2 : Créer la migration**

```bash
npx prisma migrate dev --name add-prospect-priority
```

Résultat attendu :
```
✔ Your database is now in sync with your schema.
Generated Prisma Client
```

- [ ] **Step 3 : Vérifier le typecheck**

```bash
npm run typecheck
```

Résultat attendu : aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add ProspectPriority model for AI commercial scoring"
```

---

## Task 2 : Extraire `STATUTS_FINAUX` en constante partagée

**Files:**
- Create: `lib/constants/statuts.ts`
- Modify: `lib/queries/dashboard.ts`

**Interfaces:**
- Produces: `STATUTS_FINAUX: string[]` — importable depuis `@/lib/constants/statuts`
- Consumes (Task 3) : sera réutilisée par `lib/queries/ai-export.ts`

- [ ] **Step 1 : Créer `lib/constants/statuts.ts`**

```typescript
/**
 * Libellés de statuts considérés comme "finaux" (dossier clos).
 *
 * Comparaison insensible à la casse — utilisé pour exclure ces prospects
 * des relances automatiques, des compteurs "actifs" et de l'export IA.
 */
export const STATUTS_FINAUX = ["vendu", "clôturé", "cloturé", "faux numéro"];
```

- [ ] **Step 2 : Remplacer les deux occurrences dans `lib/queries/dashboard.ts`**

Trouver dans `getProspectsARelancer` (ligne ~189) :

```typescript
  const excludedStatuts = ["vendu", "clôturé", "cloturé", "faux numéro"];
```

Remplacer par un import en haut du fichier :

```typescript
import { STATUTS_FINAUX } from "@/lib/constants/statuts";
```

et supprimer la ligne locale `const excludedStatuts = [...]`, en remplaçant ses usages (`excludedStatuts`) par `STATUTS_FINAUX` dans `getProspectsARelancer` et dans `getDashboardStats` (chercher le second bloc `NOT: { label: { in: [...` autour du calcul de `prospectsActifs`, remplacer le tableau inline par `STATUTS_FINAUX`).

- [ ] **Step 3 : Vérifier le typecheck**

```bash
npm run typecheck
```

Résultat attendu : aucune erreur.

- [ ] **Step 4 : Test manuel — non-régression**

```bash
npm run dev
```

Ouvrir `/dashboard` : la section "Prospects à relancer" et la barre de stats doivent afficher les mêmes chiffres qu'avant ce changement (le comportement ne doit pas changer, seule la constante est partagée).

- [ ] **Step 5 : Commit**

```bash
git add lib/constants/statuts.ts lib/queries/dashboard.ts
git commit -m "refactor: extract STATUTS_FINAUX into shared constant"
```

---

## Task 3 : Requête d'export des prospects actifs

**Files:**
- Create: `lib/queries/ai-export.ts`

**Interfaces:**
- Consumes: `STATUTS_FINAUX` depuis `@/lib/constants/statuts`
- Produces: `getProspectsActifsPourExport(userId?: string): Promise<ExportedUserProspects[]>` où :

```typescript
export interface ExportedProspect {
  id: string;
  nom: string;
  prenom: string | null;
  statut: string | null;
  criteres: unknown;
  notes: string | null;
  tags: string[];
  tachesOuvertes: Array<{
    titre: string;
    type: string;
    date: string;
    heure: string | null;
  }>;
  historiqueRecent: Array<{ type: string; contenu: string | null; date: string }>;
  derniereActivite: string;
}

export interface ExportedUserProspects {
  userId: string;
  prospects: ExportedProspect[];
}
```

- [ ] **Step 1 : Écrire `lib/queries/ai-export.ts`**

```typescript
/**
 * Requête d'export des prospects actifs pour l'analyse IA (n8n).
 *
 * Regroupe par agent pour permettre au cron quotidien de traiter tout le
 * monde en un seul appel, ou de scoper à un agent pour le refresh manuel.
 */
import { STATUTS_FINAUX } from "@/lib/constants/statuts";
import { prisma } from "@/lib/prisma";

export interface ExportedProspect {
  id: string;
  nom: string;
  prenom: string | null;
  statut: string | null;
  criteres: unknown;
  notes: string | null;
  tags: string[];
  tachesOuvertes: Array<{
    titre: string;
    type: string;
    date: string;
    heure: string | null;
  }>;
  historiqueRecent: Array<{ type: string; contenu: string | null; date: string }>;
  derniereActivite: string;
}

export interface ExportedUserProspects {
  userId: string;
  prospects: ExportedProspect[];
}

export async function getProspectsActifsPourExport(
  userId?: string,
): Promise<ExportedUserProspects[]> {
  const prospects = await prisma.prospect.findMany({
    where: {
      ...(userId ? { userId } : {}),
      statut: {
        NOT: { label: { in: STATUTS_FINAUX, mode: "insensitive" } },
      },
    },
    select: {
      id: true,
      nom: true,
      prenom: true,
      userId: true,
      criteres: true,
      notes: true,
      updatedAt: true,
      statut: { select: { label: true } },
      tags: { select: { label: true } },
      tasks: {
        where: { fait: false },
        select: { titre: true, type: true, date: true, heure: true },
        orderBy: { date: "asc" },
      },
      historiques: {
        select: { type: true, contenu: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  const byUser = new Map<string, ExportedProspect[]>();

  for (const p of prospects) {
    const derniereActivite = (p.historiques[0]?.createdAt ?? p.updatedAt).toISOString();

    const exported: ExportedProspect = {
      id: p.id,
      nom: p.nom,
      prenom: p.prenom,
      statut: p.statut?.label ?? null,
      criteres: p.criteres,
      notes: p.notes,
      tags: p.tags.map((t) => t.label),
      tachesOuvertes: p.tasks.map((t) => ({
        titre: t.titre,
        type: t.type,
        date: t.date.toISOString(),
        heure: t.heure,
      })),
      historiqueRecent: p.historiques.map((h) => ({
        type: h.type,
        contenu: h.contenu,
        date: h.createdAt.toISOString(),
      })),
      derniereActivite,
    };

    const list = byUser.get(p.userId) ?? [];
    list.push(exported);
    byUser.set(p.userId, list);
  }

  return Array.from(byUser.entries()).map(([uid, list]) => ({
    userId: uid,
    prospects: list,
  }));
}
```

- [ ] **Step 2 : Vérifier le typecheck**

```bash
npm run typecheck
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add lib/queries/ai-export.ts
git commit -m "feat: add getProspectsActifsPourExport query for AI export"
```

---

## Task 4 : Route `GET /api/ai/export`

**Files:**
- Create: `app/api/ai/export/route.ts`

**Interfaces:**
- Consumes: `getProspectsActifsPourExport` depuis `@/lib/queries/ai-export`
- Produces: `GET /api/ai/export?userId=<id>` (userId optionnel) — retourne `ExportedUserProspects[]` en JSON

- [ ] **Step 1 : Créer `app/api/ai/export/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getProspectsActifsPourExport } from "@/lib/queries/ai-export";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[ai export] N8N_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.nextUrl.searchParams.get("userId") ?? undefined;
  const data = await getProspectsActifsPourExport(userId);
  return NextResponse.json(data);
}
```

- [ ] **Step 2 : Vérifier le typecheck**

```bash
npm run typecheck
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Test manuel**

Lancer `npm run dev`, puis (remplacer `YOUR_SECRET` par la valeur de `N8N_WEBHOOK_SECRET` dans `.env`) :

```bash
curl http://localhost:3000/api/ai/export \
  -H "Authorization: Bearer YOUR_SECRET"
```

Résultat attendu : `200` avec un tableau JSON `[{ "userId": "...", "prospects": [...] }, ...]`.

```bash
curl http://localhost:3000/api/ai/export
```

Résultat attendu : `{"error":"Unauthorized"}` avec status `401`.

- [ ] **Step 4 : Commit**

```bash
git add app/api/ai/export/
git commit -m "feat: add GET /api/ai/export endpoint for n8n"
```

---

## Task 5 : Route `POST /api/ai/priorities/callback`

**Files:**
- Create: `app/api/ai/priorities/callback/route.ts`

**Interfaces:**
- Consumes: `prisma.prospectPriority.upsert`
- Produces: `POST /api/ai/priorities/callback` — body `[{ prospectId, score, raison }]`, retourne `{ ok: true, upserted: number, skipped: number }`

- [ ] **Step 1 : Créer `app/api/ai/priorities/callback/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { PriorityScore } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const priorityEntrySchema = z.object({
  prospectId: z.string().cuid(),
  score: z.nativeEnum(PriorityScore),
  raison: z.string().trim().min(1).max(1000),
});

const bodySchema = z.array(priorityEntrySchema);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[ai priorities callback] N8N_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  let upserted = 0;
  let skipped = 0;

  for (const entry of parsed.data) {
    const prospect = await prisma.prospect.findUnique({
      where: { id: entry.prospectId },
      select: { id: true },
    });
    if (!prospect) {
      skipped += 1;
      continue;
    }

    await prisma.prospectPriority.upsert({
      where: { prospectId: entry.prospectId },
      create: {
        prospectId: entry.prospectId,
        score: entry.score,
        raison: entry.raison,
      },
      update: {
        score: entry.score,
        raison: entry.raison,
        computedAt: new Date(),
      },
    });
    upserted += 1;
  }

  return NextResponse.json({ ok: true, upserted, skipped });
}
```

- [ ] **Step 2 : Vérifier le typecheck**

```bash
npm run typecheck
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Test manuel**

Récupérer un `prospectId` réel via Prisma Studio (`npx prisma studio`), puis :

```bash
curl -X POST http://localhost:3000/api/ai/priorities/callback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET" \
  -d '[{"prospectId":"PROSPECT_ID_ICI","score":"CHAUD","raison":"Test manuel"}]'
```

Résultat attendu : `{"ok":true,"upserted":1,"skipped":0}`. Vérifier dans Prisma Studio que la table `ProspectPriority` contient bien la ligne.

Rejouer la même commande : le compteur doit rester `upserted:1` (upsert, pas de doublon).

Tester avec un `prospectId` inexistant (mais un CUID valide) :

```bash
curl -X POST http://localhost:3000/api/ai/priorities/callback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET" \
  -d '[{"prospectId":"clxxxxxxxxxxxxxxxxxxxxxxxx","score":"FROID","raison":"Test"}]'
```

Résultat attendu : `{"ok":true,"upserted":0,"skipped":1}`, pas d'erreur 500.

- [ ] **Step 4 : Commit**

```bash
git add app/api/ai/priorities/
git commit -m "feat: add POST /api/ai/priorities/callback endpoint for n8n"
```

---

## Task 6 : Exclure les routes IA du middleware NextAuth

**Files:**
- Modify: `middleware.ts`

**Interfaces:**
- Consumes: rien (config statique)
- Produces: `/api/ai/export` et `/api/ai/priorities/callback` accessibles sans session (authentifiées par Bearer token dans leurs handlers respectifs)

- [ ] **Step 1 : Modifier le matcher dans `middleware.ts`**

Remplacer le bloc `config` complet :

```typescript
export const config = {
  matcher: [
    /*
     * Protège toutes les routes SAUF :
     *  - /login, /login/*
     *  - /api/auth/* (callback NextAuth)
     *  - /api/tasks/<id>/gcal (callback n8n, authentifié par bearer token, pas par session)
     *  - /api/ai/export, /api/ai/priorities/callback (endpoints n8n, bearer token)
     *  - assets statiques (_next, favicon, images publiques)
     */
    "/((?!login|api/auth|api/tasks/[^/]+/gcal|api/ai/export|api/ai/priorities/callback|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2 : Vérifier le typecheck**

```bash
npm run typecheck
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Test manuel — routes accessibles sans cookie de session**

```bash
curl -i http://localhost:3000/api/ai/export -H "Authorization: Bearer YOUR_SECRET"
```

Résultat attendu : statut `200` (pas de redirection `307` vers `/login`, ce qui prouverait que le middleware bloque encore la route).

- [ ] **Step 4 : Commit**

```bash
git add middleware.ts
git commit -m "fix: exclude AI export/callback routes from NextAuth middleware"
```

---

## Task 7 : Helper `notifyAiRefresh`

**Files:**
- Create: `lib/ai/notify.ts`

**Interfaces:**
- Produces: `notifyAiRefresh(userId: string): void` — importable depuis `@/lib/ai/notify`

- [ ] **Step 1 : Créer `lib/ai/notify.ts`**

```typescript
/**
 * Déclenche fire-and-forget le recalcul des priorités IA pour un agent,
 * via le webhook n8n dédié au refresh manuel (le cron quotidien tourne
 * indépendamment côté n8n et n'a pas besoin de ce déclencheur).
 */
export function notifyAiRefresh(userId: string): void {
  const url = process.env.N8N_AI_WEBHOOK_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url) return;

  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({ userId }),
  }).catch((err: unknown) => {
    console.error("[notifyAiRefresh]", err);
  });
}
```

- [ ] **Step 2 : Vérifier le typecheck**

```bash
npm run typecheck
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Test manuel — dégradation silencieuse**

Avec `N8N_AI_WEBHOOK_URL` absent du `.env`, ce module ne doit jamais faire planter l'appelant (vérifié à la Task 8 via le bouton "Actualiser").

- [ ] **Step 4 : Commit**

```bash
git add lib/ai/notify.ts
git commit -m "feat: add notifyAiRefresh fire-and-forget helper"
```

---

## Task 8 : Server Action `refreshAiPriorities`

**Files:**
- Create: `lib/actions/ai.ts`

**Interfaces:**
- Consumes: `notifyAiRefresh` depuis `@/lib/ai/notify`, `requireSession` depuis `@/lib/session`, `ActionResult` depuis `@/lib/actions/prospects`
- Produces: `refreshAiPriorities(): Promise<ActionResult<{ triggered: boolean }>>`

- [ ] **Step 1 : Créer `lib/actions/ai.ts`**

```typescript
"use server";

import type { ActionResult } from "@/lib/actions/prospects";
import { notifyAiRefresh } from "@/lib/ai/notify";
import { requireSession } from "@/lib/session";

/**
 * Déclenche le recalcul des priorités IA pour l'agent connecté.
 * Fire-and-forget : ne retourne pas le résultat du calcul (asynchrone côté
 * n8n), seulement la confirmation que la demande a été envoyée.
 */
export async function refreshAiPriorities(): Promise<
  ActionResult<{ triggered: boolean }>
> {
  const session = await requireSession();
  notifyAiRefresh(session.user.id);
  return { ok: true, data: { triggered: true } };
}
```

- [ ] **Step 2 : Vérifier le typecheck**

```bash
npm run typecheck
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add lib/actions/ai.ts
git commit -m "feat: add refreshAiPriorities server action"
```

---

## Task 9 : Requête `getPrioritesIA` pour le dashboard

**Files:**
- Create: `lib/queries/ai-priorities.ts`

**Interfaces:**
- Produces: `getPrioritesIA(userId: string): Promise<PrioriteIA[]>` où :

```typescript
export interface PrioriteIA {
  id: string;
  prospectId: string;
  prospectNom: string;
  prospectPrenom: string | null;
  score: PriorityScore;
  raison: string;
  computedAt: Date;
}
```

> Note : `score` utilise directement l'enum Prisma `PriorityScore` (pas une union de littéraux `"CHAUD" | ...`) — un enum string Prisma n'est pas assignable à une union de littéraux distincte en TypeScript strict, ça casserait le typecheck à l'étape 2.

- [ ] **Step 1 : Écrire `lib/queries/ai-priorities.ts`**

```typescript
/**
 * Requête dashboard : top 10 des priorités IA pour l'agent connecté,
 * triées Chaud → Tiède → Froid puis par date de calcul décroissante.
 */
import { PriorityScore } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export interface PrioriteIA {
  id: string;
  prospectId: string;
  prospectNom: string;
  prospectPrenom: string | null;
  score: PriorityScore;
  raison: string;
  computedAt: Date;
}

const SCORE_ORDER: Record<PriorityScore, number> = {
  [PriorityScore.CHAUD]: 0,
  [PriorityScore.TIEDE]: 1,
  [PriorityScore.FROID]: 2,
};

export async function getPrioritesIA(userId: string): Promise<PrioriteIA[]> {
  const rows = await prisma.prospectPriority.findMany({
    where: { prospect: { userId } },
    select: {
      id: true,
      score: true,
      raison: true,
      computedAt: true,
      prospect: { select: { id: true, nom: true, prenom: true } },
    },
    orderBy: { computedAt: "desc" },
    take: 50,
  });

  return rows
    .map((r) => ({
      id: r.id,
      prospectId: r.prospect.id,
      prospectNom: r.prospect.nom,
      prospectPrenom: r.prospect.prenom,
      score: r.score,
      raison: r.raison,
      computedAt: r.computedAt,
    }))
    .sort((a, b) => SCORE_ORDER[a.score] - SCORE_ORDER[b.score])
    .slice(0, 10);
}
```

- [ ] **Step 2 : Vérifier le typecheck**

```bash
npm run typecheck
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add lib/queries/ai-priorities.ts
git commit -m "feat: add getPrioritesIA query for dashboard"
```

---

## Task 10 : Section dashboard "Priorités IA du jour"

**Files:**
- Create: `app/(dashboard)/dashboard/_components/ai-priorities.tsx`
- Modify: `app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `PrioriteIA` depuis `@/lib/queries/ai-priorities`, `refreshAiPriorities` depuis `@/lib/actions/ai`, `useToast` depuis `@/hooks/use-toast`
- Produces: composant `<AiPriorities prospects={...} />` affiché en tête de la colonne gauche du dashboard

- [ ] **Step 1 : Créer `app/(dashboard)/dashboard/_components/ai-priorities.tsx`**

```typescript
/**
 * Widget : Priorités IA du jour.
 * Classement chaud/tiède/froid calculé par n8n + Claude, avec bouton
 * de rafraîchissement manuel.
 */
"use client";

import Link from "next/link";
import { PriorityScore } from "@prisma/client";
import { Sparkles, RefreshCw } from "lucide-react";
import { useTransition } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { refreshAiPriorities } from "@/lib/actions/ai";
import type { PrioriteIA } from "@/lib/queries/ai-priorities";
import { cn } from "@/lib/utils";

interface AiPrioritiesProps {
  priorites: PrioriteIA[];
}

const SCORE_STYLES: Record<PriorityScore, string> = {
  [PriorityScore.CHAUD]: "border-transparent bg-red-600 text-white hover:bg-red-600/90",
  [PriorityScore.TIEDE]: "border-transparent bg-orange-500 text-white hover:bg-orange-500/90",
  [PriorityScore.FROID]: "border-transparent bg-muted text-muted-foreground",
};

const SCORE_LABELS: Record<PriorityScore, string> = {
  [PriorityScore.CHAUD]: "Chaud",
  [PriorityScore.TIEDE]: "Tiède",
  [PriorityScore.FROID]: "Froid",
};

export function AiPriorities({ priorites }: AiPrioritiesProps): JSX.Element {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleRefresh(): void {
    startTransition(async () => {
      const result = await refreshAiPriorities();
      if (result.ok) {
        toast({
          variant: "success",
          title: "Analyse lancée",
          description: "Résultat disponible dans quelques minutes.",
        });
      } else {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-violet-600" />
          Priorités IA du jour
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-8 gap-1 text-xs"
            onClick={handleRefresh}
            disabled={isPending}
          >
            <RefreshCw className={cn("h-3 w-3", isPending && "animate-spin")} />
            Actualiser
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {priorites.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucune analyse pour l&apos;instant — clique sur Actualiser.
          </p>
        ) : (
          <ul className="space-y-2">
            {priorites.map((p) => (
              <li key={p.id} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/prospects/${p.prospectId}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {p.prospectPrenom} {p.prospectNom}
                  </Link>
                  <Badge className={cn("shrink-0 text-[10px]", SCORE_STYLES[p.score])}>
                    {SCORE_LABELS[p.score]}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.raison}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2 : Intégrer dans `app/(dashboard)/dashboard/page.tsx`**

Ajouter l'import et la requête, et placer le composant en tête de la colonne gauche. Remplacer le fichier complet :

```typescript
/**
 * Page Dashboard — point d'entrée après connexion.
 *
 * Charge toutes les données côté serveur (Server Components) et
 * les distribue aux widgets enfants.
 */
import { getServerAuthSession } from "@/lib/session";
import {
  getLeadsDuJour,
  getRappelsDuJour,
  getTachesUrgentes,
  getRendezVous,
  getProspectsARelancer,
  getDashboardStats,
} from "@/lib/queries/dashboard";
import { getPrioritesIA } from "@/lib/queries/ai-priorities";

import { DashboardHeader } from "./_components/dashboard-header";
import { StatsBar } from "./_components/stats-bar";
import { LeadsToday } from "./_components/leads-today";
import { RemindersToday } from "./_components/reminders-today";
import { UrgentTasks } from "./_components/urgent-tasks";
import { UpcomingAppointments } from "./_components/upcoming-appointments";
import { ProspectsToFollowUp } from "./_components/prospects-to-follow-up";
import { AiPriorities } from "./_components/ai-priorities";

export default async function DashboardPage(): Promise<JSX.Element> {
  const session = await getServerAuthSession();
  const userId = session!.user.id;

  // Chargement parallèle de toutes les données du dashboard
  const [leads, reminders, urgentTasks, appointments, prospectsRelance, stats, priorites] =
    await Promise.all([
      getLeadsDuJour(userId),
      getRappelsDuJour(userId),
      getTachesUrgentes(userId),
      getRendezVous(userId),
      getProspectsARelancer(userId),
      getDashboardStats(userId),
      getPrioritesIA(userId),
    ]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <DashboardHeader userName={session!.user.name} />

      {/* Compteurs résumés */}
      <StatsBar stats={stats} />

      {/* Grille de widgets */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Colonne gauche */}
        <div className="space-y-6">
          <AiPriorities priorites={priorites} />
          <RemindersToday reminders={reminders} />
          <UrgentTasks tasks={urgentTasks} />
          <ProspectsToFollowUp prospects={prospectsRelance} />
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">
          <LeadsToday leads={leads} />
          <UpcomingAppointments appointments={appointments} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3 : Vérifier le typecheck**

```bash
npm run typecheck
```

Résultat attendu : aucune erreur.

- [ ] **Step 4 : Test manuel dans le navigateur**

```bash
npm run dev
```

Ouvrir `/dashboard` :
- Sans ligne dans `ProspectPriority` → la section affiche "Aucune analyse pour l'instant — clique sur Actualiser."
- Cliquer sur "Actualiser" → toast "Analyse lancée" (même si `N8N_AI_WEBHOOK_URL` est absent, le clic ne doit jamais planter la page).
- Insérer manuellement une ligne via Prisma Studio (`npx prisma studio`, `score = CHAUD`, `raison = "Test"`) → rafraîchir `/dashboard` → la ligne apparaît avec le badge rouge "Chaud" et la raison affichée, le lien mène bien vers la fiche prospect.

- [ ] **Step 5 : Commit**

```bash
git add "app/(dashboard)/dashboard/_components/ai-priorities.tsx" "app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: add AI priorities section to dashboard"
```

---

## Task 11 : Variables d'environnement

**Files:**
- Modify: `.env.example`

**Interfaces:**
- Produces: documentation de `N8N_AI_WEBHOOK_URL` pour les développeurs

- [ ] **Step 1 : Ajouter la variable dans `.env.example`**

Ajouter à la fin du fichier (après la section n8n GCal existante) :

```bash
# ---------------------------------------------------------------------
# n8n — IA commerciale (priorités du jour)
# ---------------------------------------------------------------------
# URL du webhook n8n déclenché par le bouton "Actualiser" du dashboard.
# Le cron quotidien tourne indépendamment côté n8n (Schedule Trigger).
# Laisser vide pour désactiver le refresh manuel (dégradation silencieuse).
N8N_AI_WEBHOOK_URL="https://n8n.luminatera.com/webhook-test/crm-ai-priorities"
```

- [ ] **Step 2 : Ajouter la même variable dans `.env` local**

Copier la ligne ci-dessus dans `.env`, laisser vide tant que n8n n'est pas configuré.

- [ ] **Step 3 : Commit**

```bash
git add .env.example
git commit -m "docs: add N8N_AI_WEBHOOK_URL to .env.example"
```

---

## Task 12 : Workflow n8n (JSON importable)

**Files:**
- Create: `docs/n8n/crm-ai-priorities-workflow.json`

**Interfaces:**
- Produces: fichier JSON importable dans n8n via Import → From file

- [ ] **Step 1 : Créer `docs/n8n/crm-ai-priorities-workflow.json`**

```json
{
  "name": "CRM → IA Priorités du jour",
  "nodes": [
    {
      "parameters": {
        "rule": { "interval": [{ "field": "cronExpression", "expression": "0 6 * * *" }] }
      },
      "id": "b1c2d3e4-0001-0001-0001-000000000001",
      "name": "Cron quotidien 6h",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [240, 160]
    },
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "crm-ai-priorities",
        "authentication": "headerAuth",
        "responseMode": "lastNode",
        "options": {}
      },
      "id": "b1c2d3e4-0001-0001-0001-000000000002",
      "name": "Webhook refresh manuel",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [240, 340],
      "webhookId": "crm-ai-priorities"
    },
    {
      "parameters": {
        "url": "={{ $json.body && $json.body.userId ? $env.CRM_URL + '/api/ai/export?userId=' + $json.body.userId : $env.CRM_URL + '/api/ai/export' }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Authorization", "value": "=Bearer {{ $env.N8N_WEBHOOK_SECRET }}" }
          ]
        },
        "options": {}
      },
      "id": "b1c2d3e4-0001-0001-0001-000000000003",
      "name": "GET Export CRM",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [460, 250]
    },
    {
      "parameters": {
        "jsCode": "const agent = $json;\nconst lines = agent.prospects.map((p) => {\n  return `- id: ${p.id}\\n  nom: ${p.prenom || ''} ${p.nom}\\n  statut: ${p.statut || 'aucun'}\\n  criteres: ${JSON.stringify(p.criteres)}\\n  notes: ${p.notes || 'aucune'}\\n  tags: ${p.tags.join(', ') || 'aucun'}\\n  taches_ouvertes: ${JSON.stringify(p.tachesOuvertes)}\\n  historique_recent: ${JSON.stringify(p.historiqueRecent)}\\n  derniere_activite: ${p.derniereActivite}`;\n}).join('\\n\\n');\n\nconst prompt = `Tu es un assistant commercial immobilier. Pour chaque prospect ci-dessous, donne un score CHAUD, TIEDE ou FROID et une raison courte (1-2 phrases, en français) expliquant pourquoi le contacter aujourd'hui ou non.\\n\\nProspects:\\n${lines}\\n\\nRéponds UNIQUEMENT avec un JSON valide, un tableau d'objets {\\\"prospectId\\\": string, \\\"score\\\": \\\"CHAUD\\\"|\\\"TIEDE\\\"|\\\"FROID\\\", \\\"raison\\\": string}, sans texte autour.`;\n\nreturn [{ json: { userId: agent.userId, prompt } }];"
      },
      "id": "b1c2d3e4-0001-0001-0001-000000000005",
      "name": "Construire le prompt",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [900, 250]
    },
    {
      "parameters": {
        "modelId": { "__rl": true, "value": "claude-haiku-4-5", "mode": "list" },
        "messages": {
          "values": [{ "content": "={{ $json.prompt }}" }]
        },
        "options": {}
      },
      "id": "b1c2d3e4-0001-0001-0001-000000000006",
      "name": "Claude Haiku",
      "type": "n8n-nodes-base.anthropic",
      "typeVersion": 1,
      "position": [1120, 250],
      "credentials": {
        "anthropicApi": {
          "id": "REMPLACER_PAR_ID_CREDENTIAL",
          "name": "Anthropic CRM"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "let parsed = [];\ntry {\n  const text = $json.content?.[0]?.text || $json.text || '';\n  parsed = JSON.parse(text);\n} catch (e) {\n  // Réponse malformée : ce lot est simplement ignoré, pas de crash du workflow.\n  parsed = [];\n}\nreturn parsed.map((entry) => ({ json: entry }));"
      },
      "id": "b1c2d3e4-0001-0001-0001-000000000007",
      "name": "Parser la réponse",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1340, 250]
    },
    {
      "parameters": {
        "aggregate": "aggregateAllItemData",
        "options": {}
      },
      "id": "b1c2d3e4-0001-0001-0001-000000000008",
      "name": "Agréger tous les agents",
      "type": "n8n-nodes-base.aggregate",
      "typeVersion": 1,
      "position": [1560, 250]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $env.CRM_URL }}/api/ai/priorities/callback",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Authorization", "value": "=Bearer {{ $env.N8N_WEBHOOK_SECRET }}" },
            { "name": "Content-Type", "value": "application/json" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ $json.data }}",
        "options": {}
      },
      "id": "b1c2d3e4-0001-0001-0001-000000000009",
      "name": "Callback CRM",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1780, 250]
    }
  ],
  "connections": {
    "Cron quotidien 6h": {
      "main": [[{ "node": "GET Export CRM", "type": "main", "index": 0 }]]
    },
    "Webhook refresh manuel": {
      "main": [[{ "node": "GET Export CRM", "type": "main", "index": 0 }]]
    },
    "GET Export CRM": {
      "main": [[{ "node": "Construire le prompt", "type": "main", "index": 0 }]]
    },
    "Construire le prompt": {
      "main": [[{ "node": "Claude Haiku", "type": "main", "index": 0 }]]
    },
    "Claude Haiku": {
      "main": [[{ "node": "Parser la réponse", "type": "main", "index": 0 }]]
    },
    "Parser la réponse": {
      "main": [[{ "node": "Agréger tous les agents", "type": "main", "index": 0 }]]
    },
    "Agréger tous les agents": {
      "main": [[{ "node": "Callback CRM", "type": "main", "index": 0 }]]
    }
  },
  "active": false,
  "settings": {
    "executionOrder": "v1"
  },
  "meta": {
    "templateCredsSetupCompleted": false
  }
}
```

- [ ] **Step 2 : Instructions de configuration n8n**

Après import du JSON dans n8n :

1. **Credential Anthropic** : n8n → Credentials → New → Anthropic API. Coller la clé API Anthropic (jamais dans le CRM). Remplacer `"REMPLACER_PAR_ID_CREDENTIAL"` dans le nœud "Claude Haiku" par l'ID de la credential créée.
2. **Header Auth (Webhook refresh manuel)** : nœud "Webhook refresh manuel" → Authentication → "Header Auth" → credential Name=`Authorization`, Value=`Bearer VOTRE_SECRET` (même valeur que `N8N_WEBHOOK_SECRET` côté CRM).
3. **Variables d'environnement n8n** : Settings → Environment Variables :
   - `CRM_URL` = URL publique du CRM (déjà utilisée par le workflow GCal, réutiliser la même).
   - `N8N_WEBHOOK_SECRET` = même valeur que dans `.env` du CRM.
4. **Activer le workflow** : toggle en haut à droite.
5. **Copier l'URL du webhook** : nœud "Webhook refresh manuel" → copier l'URL → coller dans `N8N_AI_WEBHOOK_URL` dans le `.env` du CRM.

- [ ] **Step 3 : Commit**

```bash
git add docs/n8n/crm-ai-priorities-workflow.json
git commit -m "feat: add n8n AI commercial priorities workflow"
```

---

## Test end-to-end final

Une fois toute l'implémentation terminée et n8n configuré :

- [ ] Mettre `N8N_AI_WEBHOOK_URL` dans `.env` local avec l'URL n8n réelle, redémarrer `npm run dev`.
- [ ] Cliquer sur "Actualiser" dans la section "Priorités IA du jour" → vérifier dans n8n que l'exécution se déclenche et se termine sans erreur.
- [ ] Vérifier dans Prisma Studio que des lignes `ProspectPriority` ont été créées pour les prospects actifs de l'agent connecté.
- [ ] Rafraîchir `/dashboard` → la section affiche les prospects triés Chaud → Tiède → Froid avec une raison lisible en français.
- [ ] Activer le Schedule Trigger dans n8n et vérifier (ou attendre) que le cron quotidien tourne sans intervention manuelle.
- [ ] Couper temporairement `N8N_AI_WEBHOOK_URL` (vide), cliquer sur "Actualiser" → le CRM ne doit pas planter (dégradation silencieuse), toast "Analyse lancée" s'affiche quand même (comportement fire-and-forget assumé).
