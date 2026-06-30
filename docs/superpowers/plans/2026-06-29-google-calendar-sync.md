# Google Calendar Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchroniser automatiquement les tâches de type RDV du CRM vers un calendrier Google partagé via n8n (unidirectionnel CRM → GCal).

**Architecture:** Les Server Actions existants (createTask, updateTask, deleteTask) envoient un webhook fire-and-forget à n8n après chaque opération sur un RDV. n8n crée/modifie/supprime l'événement Google Calendar correspondant, puis rappelle le CRM via `/api/tasks/[id]/gcal` pour stocker le `googleCalendarEventId`.

**Tech Stack:** Next.js 14 App Router, Prisma 5, PostgreSQL (Supabase), n8n (self-hosted ou cloud), Google Calendar API via n8n OAuth2.

## Global Constraints

- Next.js 14 App Router — pas de Pages Router
- Server Actions avec `"use server"` — pas de route API pour le CRUD des tâches
- Prisma 5 — migrations via `prisma migrate dev`
- TypeScript strict — vérifier avec `npm run typecheck` après chaque tâche
- Pas de test runner configuré — vérification par typecheck + tests manuels curl
- `N8N_WEBHOOK_URL` absent → dégradation silencieuse (pas d'erreur, pas de crash)
- Ne jamais committer `.env` (déjà dans `.gitignore`)

---

## Carte des fichiers

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `prisma/schema.prisma` | Modifier | Ajouter `googleCalendarEventId String?` sur `Task` |
| `lib/gcal/notify.ts` | Créer | Helper fire-and-forget vers n8n |
| `lib/tasks/access.ts` | Modifier | Étendre `findAccessibleTask` avec `type` + `googleCalendarEventId` |
| `lib/actions/tasks.ts` | Modifier | Hooks GCal dans createTask / updateTask / deleteTask |
| `app/api/tasks/[id]/gcal/route.ts` | Créer | Callback sécurisé pour que n8n stocke le GCal event ID |
| `.env.example` | Modifier | Documenter N8N_WEBHOOK_URL, N8N_WEBHOOK_SECRET, CRM_URL |
| `docs/n8n/crm-gcal-workflow.json` | Créer | Workflow n8n importable |

---

## Task 1 : Migration Prisma — ajout de googleCalendarEventId

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: champ `googleCalendarEventId: String?` disponible sur le modèle `Task` dans Prisma Client

- [ ] **Step 1 : Ajouter le champ dans schema.prisma**

Ouvrir `prisma/schema.prisma`. Trouver le modèle `Task` (autour de la ligne 220). Ajouter le champ **avant** `createdAt` :

```prisma
model Task {
  id          String   @id @default(cuid())
  type        TaskType @default(RAPPEL)
  titre       String
  commentaire String?  @db.Text
  date        DateTime
  heure       String?
  fait        Boolean  @default(false)

  googleCalendarEventId String?   // ← ajouter cette ligne

  prospectId String
  prospect   Prospect @relation(fields: [prospectId], references: [id], onDelete: Cascade)

  assignedUserId String
  assignedUser   User   @relation("TaskAssignedUser", fields: [assignedUserId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([assignedUserId, fait, date])
  @@index([assignedUserId, type, date])
  @@index([prospectId])
}
```

- [ ] **Step 2 : Créer la migration**

```bash
npx prisma migrate dev --name add-gcal-event-id
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

Résultat attendu : aucune erreur TypeScript.

- [ ] **Step 4 : Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add googleCalendarEventId to Task model"
```

---

## Task 2 : Helper fire-and-forget `lib/gcal/notify.ts`

**Files:**
- Create: `lib/gcal/notify.ts`

**Interfaces:**
- Produces: `notifyGcal(payload: GcalNotifyPayload): void` — importable depuis `@/lib/gcal/notify`

- [ ] **Step 1 : Créer `lib/gcal/notify.ts`**

```typescript
type GcalAction = "create" | "update" | "delete";

export interface GcalNotifyPayload {
  action: GcalAction;
  taskId: string;
  googleCalendarEventId?: string | null;
  titre?: string;
  date?: string;
  heure?: string | null;
  commentaire?: string | null;
  prospectNom?: string;
  prospectPrenom?: string | null;
}

export function notifyGcal(payload: GcalNotifyPayload): void {
  const url = process.env.N8N_WEBHOOK_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url) return;

  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(payload),
  }).catch((err: unknown) => {
    console.error("[notifyGcal]", err);
  });
}
```

- [ ] **Step 2 : Vérifier le typecheck**

```bash
npm run typecheck
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Test manuel — dégradation silencieuse**

Avec `N8N_WEBHOOK_URL` absent (ne pas le mettre dans `.env` pour l'instant), lancer `npm run dev` et créer un RDV dans le CRM. La tâche doit se créer sans erreur, sans log d'erreur dans la console Next.js.

- [ ] **Step 4 : Commit**

```bash
git add lib/gcal/notify.ts
git commit -m "feat: add notifyGcal fire-and-forget helper"
```

---

## Task 3 : Étendre findAccessibleTask

**Files:**
- Modify: `lib/tasks/access.ts`

**Interfaces:**
- Consumes: `prisma.task.findUnique` avec les champs existants
- Produces: `findAccessibleTask` retourne maintenant aussi `type: TaskType` et `googleCalendarEventId: string | null`

- [ ] **Step 1 : Modifier `lib/tasks/access.ts`**

Trouver la fonction `findAccessibleTask` (ligne ~55). Remplacer le bloc complet :

```typescript
import type { Session } from "next-auth";
import type { TaskType } from "@prisma/client";  // ← ajouter cet import

// ... garder les autres imports et fonctions existantes ...

/** Récupère une tâche si elle est assignée à l'utilisateur, ou s'il a une vision globale. */
export async function findAccessibleTask(
  taskId: string,
  session: Session,
): Promise<{
  id: string;
  fait: boolean;
  prospectId: string;
  titre: string;
  date: Date;
  assignedUserId: string;
  type: TaskType;
  googleCalendarEventId: string | null;
} | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      fait: true,
      prospectId: true,
      titre: true,
      date: true,
      assignedUserId: true,
      type: true,
      googleCalendarEventId: true,
    },
  });

  if (!task) return null;
  if (task.assignedUserId === session.user.id) return task;
  if (canViewAllTasks(session.user.role)) return task;
  return null;
}
```

- [ ] **Step 2 : Vérifier le typecheck**

```bash
npm run typecheck
```

Résultat attendu : aucune erreur. Si des erreurs apparaissent dans les callers (ex : `task.type` utilisé sans que ce soit défini), elles seront corrigées à la Task 4.

- [ ] **Step 3 : Commit**

```bash
git add lib/tasks/access.ts
git commit -m "feat: extend findAccessibleTask with type and googleCalendarEventId"
```

---

## Task 4 : Hooks GCal dans les Server Actions

**Files:**
- Modify: `lib/actions/tasks.ts`

**Interfaces:**
- Consumes: `notifyGcal` depuis `@/lib/gcal/notify`, `findAccessibleTask` retournant `type` et `googleCalendarEventId`
- Produces: createTask / updateTask / deleteTask déclenchent notifyGcal quand type === "RDV"

- [ ] **Step 1 : Ajouter l'import de notifyGcal en haut de `lib/actions/tasks.ts`**

Ajouter après les imports existants :

```typescript
import { notifyGcal } from "@/lib/gcal/notify";
```

- [ ] **Step 2 : Modifier createTask**

Dans `createTask`, après le bloc `prisma.task.create` (qui retourne `task`) et **avant** `revalidateTaskPaths`, ajouter :

```typescript
if (parsed.data.type === "RDV") {
  notifyGcal({
    action: "create",
    taskId: task.id,
    titre: task.titre,
    date: task.date.toISOString(),
    heure: task.heure,
    commentaire: task.commentaire,
    prospectNom: prospect.nom,
    prospectPrenom: prospect.prenom,
  });
}
```

Le `prisma.task.create` retourne déjà `task` avec tous ces champs. `prospect` est déjà disponible dans le scope (fetché par `findAccessibleProspect`).

- [ ] **Step 3 : Modifier updateTask**

Dans `updateTask`, après `prisma.task.update` et **avant** `revalidateTaskPaths`, ajouter :

```typescript
const wasRdv = task.type === "RDV";
const isRdv = parsed.data.type === "RDV";

if (wasRdv && isRdv) {
  notifyGcal({
    action: "update",
    taskId: task.id,
    googleCalendarEventId: task.googleCalendarEventId,
    titre: parsed.data.titre,
    date: new Date(parsed.data.date).toISOString(),
    heure: parsed.data.heure || null,
    commentaire: parsed.data.commentaire || null,
  });
} else if (wasRdv && !isRdv && task.googleCalendarEventId) {
  notifyGcal({
    action: "delete",
    taskId: task.id,
    googleCalendarEventId: task.googleCalendarEventId,
  });
} else if (!wasRdv && isRdv) {
  const prospect = await prisma.prospect.findUnique({
    where: { id: task.prospectId },
    select: { nom: true, prenom: true },
  });
  if (prospect) {
    notifyGcal({
      action: "create",
      taskId: task.id,
      titre: parsed.data.titre,
      date: new Date(parsed.data.date).toISOString(),
      heure: parsed.data.heure || null,
      commentaire: parsed.data.commentaire || null,
      prospectNom: prospect.nom,
      prospectPrenom: prospect.prenom,
    });
  }
}
```

- [ ] **Step 4 : Modifier deleteTask**

Dans `deleteTask`, **avant** `prisma.task.delete`, ajouter :

```typescript
if (task.type === "RDV" && task.googleCalendarEventId) {
  notifyGcal({
    action: "delete",
    taskId: task.id,
    googleCalendarEventId: task.googleCalendarEventId,
  });
}
```

- [ ] **Step 5 : Vérifier le typecheck**

```bash
npm run typecheck
```

Résultat attendu : aucune erreur TypeScript.

- [ ] **Step 6 : Commit**

```bash
git add lib/actions/tasks.ts
git commit -m "feat: trigger Google Calendar sync on RDV tasks create/update/delete"
```

---

## Task 5 : Route API callback `/api/tasks/[id]/gcal`

**Files:**
- Create: `app/api/tasks/[id]/gcal/route.ts`

**Interfaces:**
- Consumes: `prisma.task.update` pour stocker `googleCalendarEventId`
- Produces: `POST /api/tasks/{id}/gcal` — endpoint appelé par n8n après création GCal

- [ ] **Step 1 : Créer `app/api/tasks/[id]/gcal/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { googleCalendarEventId } = body as { googleCalendarEventId?: unknown };
  if (!googleCalendarEventId || typeof googleCalendarEventId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid googleCalendarEventId" },
      { status: 400 },
    );
  }

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await prisma.task.update({
    where: { id: params.id },
    data: { googleCalendarEventId },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2 : Vérifier le typecheck**

```bash
npm run typecheck
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Test manuel de la route**

Lancer le serveur dev : `npm run dev`

Tester avec curl (remplacer `YOUR_SECRET` par la valeur de `N8N_WEBHOOK_SECRET` dans `.env`) :

```bash
# Créer d'abord un RDV dans le CRM pour obtenir un taskId réel, puis :
curl -X POST http://localhost:3000/api/tasks/TASK_ID_ICI/gcal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET" \
  -d '{"googleCalendarEventId":"evt_test_123"}'
```

Résultat attendu : `{"ok":true}`

Vérifier en base via Prisma Studio (`npx prisma studio`) que `googleCalendarEventId` = `"evt_test_123"` sur la tâche.

Test du rejet sans secret :
```bash
curl -X POST http://localhost:3000/api/tasks/TASK_ID_ICI/gcal \
  -H "Content-Type: application/json" \
  -d '{"googleCalendarEventId":"evt_test_123"}'
```

Résultat attendu : `{"error":"Unauthorized"}` avec status 401.

- [ ] **Step 4 : Commit**

```bash
git add app/api/tasks/
git commit -m "feat: add POST /api/tasks/[id]/gcal callback endpoint for n8n"
```

---

## Task 6 : Variables d'environnement

**Files:**
- Modify: `.env.example`

**Interfaces:**
- Produces: documentation des 3 nouvelles variables pour les développeurs

- [ ] **Step 1 : Ajouter les variables dans `.env.example`**

Ajouter à la fin du fichier :

```bash
# ---------------------------------------------------------------------
# n8n — Synchronisation Google Calendar
# ---------------------------------------------------------------------
# URL du webhook n8n qui reçoit les événements RDV du CRM.
# Laisser vide pour désactiver la synchro (dégradation silencieuse).
N8N_WEBHOOK_URL="https://ton-n8n.com/webhook/crm-gcal"

# Secret partagé entre le CRM et n8n pour sécuriser les échanges.
# Générer avec : openssl rand -base64 32
N8N_WEBHOOK_SECRET="changez-moi"

# URL publique du CRM, utilisée par n8n pour le callback de stockage de l'event ID.
# Local : http://localhost:3000
# Prod  : https://votre-domaine.vercel.app
CRM_URL="http://localhost:3000"
```

- [ ] **Step 2 : Ajouter les mêmes variables dans `.env` local**

Copier les lignes ci-dessus dans ton `.env`, avec les vraies valeurs une fois n8n configuré. Pour l'instant, laisser `N8N_WEBHOOK_URL` vide.

- [ ] **Step 3 : Commit**

```bash
git add .env.example
git commit -m "docs: add n8n Google Calendar env vars to .env.example"
```

---

## Task 7 : Workflow n8n (JSON importable)

**Files:**
- Create: `docs/n8n/crm-gcal-workflow.json`

**Interfaces:**
- Produces: fichier JSON importable dans n8n via Import → From file

- [ ] **Step 1 : Créer `docs/n8n/crm-gcal-workflow.json`**

```json
{
  "name": "CRM → Google Calendar",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "crm-gcal",
        "authentication": "headerAuth",
        "responseMode": "lastNode",
        "options": {}
      },
      "id": "a1b2c3d4-0001-0001-0001-000000000001",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [240, 300],
      "webhookId": "crm-gcal"
    },
    {
      "parameters": {
        "rules": {
          "rules": [
            {
              "conditions": {
                "options": { "caseSensitive": true, "leftValue": "", "typeValidation": "strict" },
                "combinator": "and",
                "conditions": [
                  {
                    "leftValue": "={{ $json.body.action }}",
                    "rightValue": "create",
                    "operator": { "type": "string", "operation": "equals" }
                  }
                ]
              },
              "renameOutput": true,
              "outputKey": "create"
            },
            {
              "conditions": {
                "options": { "caseSensitive": true, "leftValue": "", "typeValidation": "strict" },
                "combinator": "and",
                "conditions": [
                  {
                    "leftValue": "={{ $json.body.action }}",
                    "rightValue": "update",
                    "operator": { "type": "string", "operation": "equals" }
                  }
                ]
              },
              "renameOutput": true,
              "outputKey": "update"
            },
            {
              "conditions": {
                "options": { "caseSensitive": true, "leftValue": "", "typeValidation": "strict" },
                "combinator": "and",
                "conditions": [
                  {
                    "leftValue": "={{ $json.body.action }}",
                    "rightValue": "delete",
                    "operator": { "type": "string", "operation": "equals" }
                  }
                ]
              },
              "renameOutput": true,
              "outputKey": "delete"
            }
          ]
        },
        "options": {}
      },
      "id": "a1b2c3d4-0001-0001-0001-000000000002",
      "name": "Switch Action",
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3,
      "position": [460, 300]
    },
    {
      "parameters": {
        "jsCode": "const body = $json.body;\nconst dateStr = body.date;\nconst heure = body.heure || '09:00';\n\nconst base = new Date(dateStr);\nconst [hours, minutes] = heure.split(':').map(Number);\n\nconst start = new Date(base);\nstart.setUTCHours(hours, minutes, 0, 0);\n\nconst end = new Date(start);\nend.setUTCHours(end.getUTCHours() + 1);\n\nreturn [{\n  json: {\n    ...body,\n    startDateTime: start.toISOString(),\n    endDateTime: end.toISOString()\n  }\n}];"
      },
      "id": "a1b2c3d4-0001-0001-0001-000000000003",
      "name": "Build Datetime (Create)",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [680, 160]
    },
    {
      "parameters": {
        "operation": "create",
        "calendar": {
          "__rl": true,
          "value": "primary",
          "mode": "list",
          "cachedResultName": "CRM RDV"
        },
        "start": "={{ $json.startDateTime }}",
        "end": "={{ $json.endDateTime }}",
        "additionalFields": {
          "summary": "=[RDV] {{ $json.titre }} — {{ $json.prospectPrenom }} {{ $json.prospectNom }}",
          "description": "={{ $json.commentaire ? $json.commentaire + '\\n\\n' : '' }}CRM Task ID: {{ $json.taskId }}"
        }
      },
      "id": "a1b2c3d4-0001-0001-0001-000000000004",
      "name": "GCal Create Event",
      "type": "n8n-nodes-base.googleCalendar",
      "typeVersion": 1,
      "position": [900, 160],
      "credentials": {
        "googleCalendarOAuth2Api": {
          "id": "REMPLACER_PAR_ID_CREDENTIAL",
          "name": "Google Calendar CRM"
        }
      }
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $env.CRM_URL }}/api/tasks/{{ $('Webhook').item.json.body.taskId }}/gcal",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "=Bearer {{ $env.N8N_WEBHOOK_SECRET }}"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "googleCalendarEventId",
              "value": "={{ $json.id }}"
            }
          ]
        },
        "options": {}
      },
      "id": "a1b2c3d4-0001-0001-0001-000000000005",
      "name": "Callback CRM",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1120, 160]
    },
    {
      "parameters": {
        "jsCode": "const body = $json.body;\nconst dateStr = body.date;\nconst heure = body.heure || '09:00';\n\nconst base = new Date(dateStr);\nconst [hours, minutes] = heure.split(':').map(Number);\n\nconst start = new Date(base);\nstart.setUTCHours(hours, minutes, 0, 0);\n\nconst end = new Date(start);\nend.setUTCHours(end.getUTCHours() + 1);\n\nreturn [{\n  json: {\n    ...body,\n    startDateTime: start.toISOString(),\n    endDateTime: end.toISOString()\n  }\n}];"
      },
      "id": "a1b2c3d4-0001-0001-0001-000000000006",
      "name": "Build Datetime (Update)",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [680, 320]
    },
    {
      "parameters": {
        "operation": "update",
        "calendar": {
          "__rl": true,
          "value": "primary",
          "mode": "list",
          "cachedResultName": "CRM RDV"
        },
        "eventId": "={{ $json.googleCalendarEventId }}",
        "updateFields": {
          "start": "={{ $json.startDateTime }}",
          "end": "={{ $json.endDateTime }}",
          "summary": "=[RDV] {{ $json.titre }}",
          "description": "={{ $json.commentaire ? $json.commentaire + '\\n\\n' : '' }}CRM Task ID: {{ $json.taskId }}"
        }
      },
      "id": "a1b2c3d4-0001-0001-0001-000000000007",
      "name": "GCal Update Event",
      "type": "n8n-nodes-base.googleCalendar",
      "typeVersion": 1,
      "position": [900, 320],
      "credentials": {
        "googleCalendarOAuth2Api": {
          "id": "REMPLACER_PAR_ID_CREDENTIAL",
          "name": "Google Calendar CRM"
        }
      }
    },
    {
      "parameters": {
        "operation": "delete",
        "calendar": {
          "__rl": true,
          "value": "primary",
          "mode": "list",
          "cachedResultName": "CRM RDV"
        },
        "eventId": "={{ $json.body.googleCalendarEventId }}"
      },
      "id": "a1b2c3d4-0001-0001-0001-000000000008",
      "name": "GCal Delete Event",
      "type": "n8n-nodes-base.googleCalendar",
      "typeVersion": 1,
      "position": [680, 480],
      "credentials": {
        "googleCalendarOAuth2Api": {
          "id": "REMPLACER_PAR_ID_CREDENTIAL",
          "name": "Google Calendar CRM"
        }
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [{ "node": "Switch Action", "type": "main", "index": 0 }]
      ]
    },
    "Switch Action": {
      "main": [
        [{ "node": "Build Datetime (Create)", "type": "main", "index": 0 }],
        [{ "node": "Build Datetime (Update)", "type": "main", "index": 0 }],
        [{ "node": "GCal Delete Event", "type": "main", "index": 0 }]
      ]
    },
    "Build Datetime (Create)": {
      "main": [
        [{ "node": "GCal Create Event", "type": "main", "index": 0 }]
      ]
    },
    "GCal Create Event": {
      "main": [
        [{ "node": "Callback CRM", "type": "main", "index": 0 }]
      ]
    },
    "Build Datetime (Update)": {
      "main": [
        [{ "node": "GCal Update Event", "type": "main", "index": 0 }]
      ]
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

1. **Credentials Google Calendar** : Dans n8n → Credentials → New → Google Calendar OAuth2. Se connecter avec le compte Google partagé CRM. Remplacer `"REMPLACER_PAR_ID_CREDENTIAL"` dans les 3 nœuds GCal par l'ID de la credential créée.

2. **Header Auth (Webhook)** : Dans le nœud Webhook → Authentication → choisir "Header Auth" → créer une credential avec Name=`Authorization`, Value=`Bearer VOTRE_SECRET`.

3. **Variables d'environnement n8n** : Dans n8n → Settings → Environment Variables, ajouter :
   - `CRM_URL` = URL publique du CRM (ex: `https://ton-crm.vercel.app`)
   - `N8N_WEBHOOK_SECRET` = même valeur que dans `.env` du CRM

4. **Calendar ID** : Dans les nœuds GCal, changer `"primary"` par l'ID du calendrier partagé CRM si ce n'est pas le calendrier principal du compte.

5. **Activer le workflow** : cliquer sur le toggle en haut à droite du workflow.

6. **Copier l'URL du webhook** : cliquer sur le nœud Webhook → copier l'URL → mettre cette URL dans `N8N_WEBHOOK_URL` dans le `.env` du CRM.

- [ ] **Step 3 : Commit**

```bash
git add docs/n8n/crm-gcal-workflow.json
git commit -m "feat: add n8n Google Calendar sync workflow"
```

---

## Test end-to-end final

Une fois toute l'implémentation terminée et n8n configuré :

- [ ] Mettre `N8N_WEBHOOK_URL` dans `.env` local avec l'URL n8n réelle
- [ ] Créer un RDV dans le CRM → vérifier qu'un événement apparaît dans Google Calendar dans les 5 secondes
- [ ] Modifier le RDV (changer l'heure) → vérifier que l'événement GCal est mis à jour
- [ ] Supprimer le RDV → vérifier que l'événement GCal disparaît
- [ ] Changer le type d'une tâche RDV → RAPPEL → vérifier que l'événement GCal est supprimé
- [ ] Couper n8n, créer un RDV → vérifier que le CRM ne crashe pas (dégradation silencieuse)
