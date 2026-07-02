# IA commerciale — Priorités du jour (P5, première tranche)

## Contexte

Le TODO (P5 — IA commerciale) décrit plusieurs capacités : détection chaud/froid, priorités du jour, génération d'email/SMS, assistant conversationnel. Cette spec couvre uniquement la première tranche, choisie comme fondation : **détection chaud/froid + priorités du jour**, affichées sur le dashboard. Les autres capacités (génération d'email/SMS, assistant conversationnel) feront l'objet de specs ultérieures.

## Principe directeur

Maximiser l'usage de n8n, minimiser le code applicatif du CRM — même logique que la synchronisation Google Calendar déjà en place (`lib/gcal/notify.ts`, `app/api/tasks/[id]/gcal/route.ts`). Le CRM ne contient **aucune clé Anthropic, aucun SDK IA, aucune logique de prompt**. Il expose seulement deux endpoints (lecture + écriture) ; toute l'orchestration (planification, construction du prompt, appel à Claude) vit dans n8n.

## Architecture

```
n8n (Schedule Trigger quotidien 6h  OU  Webhook Trigger refresh manuel)
   │
   ├─▶ GET  {CRM_URL}/api/ai/export[?userId=]      (CRM, Bearer-secured, lecture seule)
   │
   ├─▶ n8n : groupe par agent → construit le prompt → Claude Haiku → parse score+raison
   │
   └─▶ POST {CRM_URL}/api/ai/priorities/callback   (CRM, Bearer-secured, upsert)

Dashboard : lit le résultat stocké en base. Aucun appel IA au chargement de la page.
```

Deux déclencheurs convergent vers la même logique n8n :
- **Cron quotidien** (tous les agents) — Schedule Trigger natif n8n, aucune action du CRM.
- **Bouton "Actualiser"** (un seul agent) — le CRM envoie un webhook fire-and-forget vers n8n (`notifyAiRefresh`), n8n rejoue la même logique scopée à cet agent.

## Modèle de données

```prisma
enum PriorityScore {
  CHAUD
  TIEDE
  FROID
}

model ProspectPriority {
  id         String        @id @default(cuid())
  prospectId String        @unique
  prospect   Prospect      @relation(fields: [prospectId], references: [id], onDelete: Cascade)
  score      PriorityScore
  raison     String        @db.Text
  computedAt DateTime      @default(now())
}
```

Une ligne par prospect : le calcul du jour écrase le précédent (photo du jour, pas d'historique). `onDelete: Cascade` — si le prospect est supprimé, sa priorité l'est aussi.

### Nettoyage connexe : `STATUTS_FINAUX`

`lib/queries/dashboard.ts` contient déjà deux fois la liste `["vendu", "clôturé", "faux numéro"]` pour définir les prospects "actifs" (`getProspectsARelancer`, `getDashboardStats`). Cette spec réutilise cette même notion pour scoper l'export IA — donc extraction en constante partagée :

```typescript
// lib/constants/statuts.ts
export const STATUTS_FINAUX = ["vendu", "clôturé", "cloturé", "faux numéro"];
```

Les deux fonctions existantes sont mises à jour pour l'importer, plus la nouvelle requête d'export IA.

## Endpoints CRM

### `GET /api/ai/export?userId=<id>` (userId optionnel)

- Auth : `Authorization: Bearer <N8N_WEBHOOK_SECRET>` (réutilise le secret existant du flux gcal — pas de nouveau secret). Absence/mismatch → 401.
- Sans `userId` : tous les prospects actifs (hors `STATUTS_FINAUX`) de tous les agents, groupés par `userId`. Utilisé par le cron quotidien.
- Avec `userId` : uniquement les prospects actifs de cet agent. Utilisé par le refresh manuel.
- Par prospect exporté : `id`, `nom`, `prenom`, `statut.label`, `criteres` (JSON), `notes`, `tags[].label`, tâches ouvertes (`titre`, `type`, `date`, `heure`, `fait`), 10 derniers `historiques` (`type`, `contenu`, `createdAt`), date de dernière activité (même logique que `getProspectsARelancer` : dernier historique sinon `updatedAt`).

### `POST /api/ai/priorities/callback`

- Auth : même Bearer secret.
- Body : `[{ prospectId: string, score: "CHAUD" | "TIEDE" | "FROID", raison: string }]`.
- Traitement : upsert `ProspectPriority` par `prospectId`. Si un `prospectId` n'existe plus (supprimé entre l'export et le callback), l'entrée est ignorée silencieusement — pas d'erreur 500, le reste du tableau est quand même traité.
- Idempotent : rejouable sans risque (upsert, pas d'insert pur).

### Bouton "Actualiser" côté CRM

- `lib/ai/notify.ts` — `notifyAiRefresh(userId: string): void`, calqué sur `notifyGcal` : POST fire-and-forget vers `N8N_AI_WEBHOOK_URL` avec `{ userId }`. Dégradation silencieuse si la variable est absente (pas d'erreur, pas de crash).
- Server action `refreshAiPriorities()` dans `lib/actions/ai.ts` : appelle `notifyAiRefresh(session.user.id)`, retourne un statut pour afficher un toast "Analyse lancée, résultat dans quelques minutes."

### Variables d'environnement nouvelles

Une seule nouvelle variable : `N8N_AI_WEBHOOK_URL` (webhook n8n dédié au refresh manuel). Réutilise `N8N_WEBHOOK_SECRET` et `CRM_URL` déjà présents dans `.env.example`. Aucune clé Anthropic côté CRM.

## UI Dashboard

Nouvelle section **"Priorités IA du jour"** (`app/(dashboard)/dashboard/_components/ai-priorities.tsx`), en tête de la colonne gauche du dashboard (avant `RemindersToday`).

- En-tête de section avec bouton "Actualiser" (déclenche `refreshAiPriorities()`, toast de confirmation).
- Liste des prospects avec une priorité calculée, triée `CHAUD` → `TIEDE` → `FROID` puis `computedAt` desc, limitée à 10 (top 10).
- Par ligne : badge coloré (rouge = Chaud, orange = Tiède, gris = Froid), nom du prospect en lien vers sa fiche, raison (texte généré par Claude, 1-2 phrases).
- État vide (aucune ligne `ProspectPriority` pour cet agent) : message "Aucune analyse pour l'instant — clique sur Actualiser." avec le bouton mis en avant.

Nouvelle requête `getPrioritesIA(userId)` dans `lib/queries/dashboard.ts` (ou fichier dédié `lib/queries/ai-priorities.ts` si le fichier dashboard.ts devient trop long) : lit `ProspectPriority` jointe à `Prospect` pour l'agent courant, triée et limitée à 10.

## Workflow n8n (`docs/n8n/crm-ai-priorities-workflow.json`)

Même format que `crm-gcal-workflow.json` (JSON importable + instructions de configuration en fin de fichier).

- **Schedule Trigger** (quotidien, 6h) et **Webhook Trigger** (reçoit `{ userId }` du bouton Actualiser) → convergent vers la suite.
- **HTTP Request** → `GET {CRM_URL}/api/ai/export` (avec `?userId=` si venant du webhook manuel), header `Authorization: Bearer {N8N_WEBHOOK_SECRET}`.
- **Code node** : regroupe les prospects par `userId`.
- **Split In Batches** (un passage par agent) → **Code node** : construit le prompt (contexte de chaque prospect : notes, critères, historique, tâches ouvertes, jours sans contact + instruction de classification chaud/tiède/froid + format de sortie JSON strict attendu) → **nœud Anthropic** (modèle `claude-haiku-4-5`, credential configurée directement dans n8n) → **Code node** : parse la réponse JSON ; toute entrée malformée ou un prospect manquant dans la réponse est simplement omis (pas de retry, pas de crash du batch).
- Agrège les résultats de tous les agents traités → **HTTP Request** → `POST {CRM_URL}/api/ai/priorities/callback`, même Bearer secret.

### Gestion d'erreur

- `N8N_AI_WEBHOOK_URL` absent → clic sur "Actualiser" ne fait rien côté CRM (silencieux), le cron quotidien reste la source de vérité.
- Réponse Claude malformée pour un prospect donné → ce prospect est omis du callback ; les autres prospects du même batch sont quand même traités.
- Callback CRM idempotent → en cas de double exécution n8n (retry), aucun risque de duplication (upsert par `prospectId`).

## Hors périmètre (spec future)

- Génération d'email/SMS de relance.
- Assistant conversationnel sur un prospect.
- Historique des scores dans le temps (actuellement : uniquement le dernier calcul).
- Vue manager/admin cross-agents (le dashboard reste scopé à l'agent connecté, comme le reste du dashboard existant).
