# Suppression en masse — mes tâches / mes prospects

## Contexte

L'utilisateur veut deux actions destructrices en un clic :
- Supprimer toutes ses tâches (rappels/RDV).
- Supprimer tous ses prospects (ce qui supprime en cascade leurs tâches et leur historique).

## Périmètre

Les deux actions sont **toujours scopées à l'utilisateur courant** (`session.user.id`), indépendamment du rôle (ADMIN/MANAGER inclus) :
- Tâches : `Task.assignedUserId = session.user.id`.
- Prospects : `Prospect.userId = session.user.id`.

Ce ne sont pas des actions d'administration globale — un ADMIN ne peut pas purger les données des autres utilisateurs via ce bouton.

## Emplacement

Section **"Zone dangereuse"** ajoutée en bas de la page existante `/parametres/statuts` (pas de nouvelle route — c'est aujourd'hui l'unique page de paramètres). Deux cartes : "Supprimer toutes mes tâches" et "Supprimer tous mes prospects".

## Synchronisation Google Calendar

La cascade Prisma (`onDelete: Cascade` sur `Task.prospectId`) supprime les lignes en base mais ne déclenche aucun code applicatif. Or les tâches de type `RDV` avec un `googleCalendarEventId` non nul doivent notifier n8n pour supprimer l'événement Google Calendar correspondant (cf. `notifyGcal` dans `lib/gcal/notify.ts`, déjà utilisé par `deleteTask`).

Donc, avant toute suppression en masse :
1. Récupérer les tâches concernées (`type: "RDV"`, `googleCalendarEventId: { not: null }`).
2. Appeler `notifyGcal({ action: "delete", taskId, googleCalendarEventId })` pour chacune (fire-and-forget, non bloquant — comportement identique à l'existant).
3. Exécuter la suppression en base (`deleteMany`).

## Confirmation

Réutilisation du composant `AlertDialog` existant (`components/ui/alert-dialog.tsx`), avec :
- Le nombre exact d'éléments concernés affiché (ex. "42 tâches" / "17 prospects").
- Un champ texte obligatoire : l'utilisateur doit taper **SUPPRIMER** pour activer le bouton de confirmation (protection contre le clic accidentel, action irréversible).

Pas de journalisation dans `HistoriqueAction` (une purge en masse n'a pas vocation à être tracée élément par élément). Un toast de succès indique le nombre d'éléments supprimés.

## Server Actions

### `deleteAllMyTasks()` — `lib/actions/tasks.ts`

```
requireSession()
→ fetch tasks WHERE assignedUserId = session.user.id
  (select id, type, googleCalendarEventId)
→ notifyGcal("delete") pour chaque RDV avec googleCalendarEventId
→ prisma.task.deleteMany({ where: { assignedUserId: session.user.id } })
→ revalidatePath("/taches"), revalidatePath("/dashboard")
→ return { ok: true, data: { count } }
```

### `deleteAllMyProspects()` — `lib/actions/prospects.ts`

```
requireSession()
→ fetch tasks WHERE prospect.userId = session.user.id
  AND type = "RDV" AND googleCalendarEventId IS NOT NULL
  (select id, googleCalendarEventId)
→ notifyGcal("delete") pour chacune
→ prisma.prospect.deleteMany({ where: { userId: session.user.id } })
  (cascade : Task, HistoriqueAction, relation ProspectTags supprimés automatiquement)
→ revalidatePath("/prospects"), revalidatePath("/taches"), revalidatePath("/dashboard")
→ return { ok: true, data: { count } }
```

### Actions de comptage (pour affichage avant confirmation)

Deux petites requêtes `count()` exposées côté serveur (ou passées en props depuis le Server Component de la page paramètres) pour afficher "42 tâches" / "17 prospects" dans le dialogue sans requête client supplémentaire.

## Composant UI

`DangerZoneAction` (client component réutilisable, `app/(dashboard)/parametres/statuts/_components/danger-zone-action.tsx`) :

Props : `title`, `description`, `confirmWord` (fixe : `"SUPPRIMER"`), `count`, `action` (server action à appeler), `onSuccessMessage`.

Comportement : bouton destructif → `AlertDialog` avec description + champ input contrôlé → bouton de confirmation `disabled` tant que l'input ne correspond pas exactement à `confirmWord` → `useTransition` + toast succès/erreur, comme `ProspectDeleteButton`.

Utilisé deux fois dans une nouvelle section sur `app/(dashboard)/parametres/statuts/page.tsx`.

## Erreurs / edge cases

- Aucune tâche/prospect à supprimer (count = 0) : bouton désactivé avec message "Rien à supprimer".
- Échec de suppression DB : toast d'erreur, aucune donnée partiellement supprimée n'est laissée incohérente grâce à `deleteMany` (opération atomique unique par table).
- Échec d'un appel `notifyGcal` individuel : n'interrompt pas la suite (fire-and-forget, erreurs loguées côté serveur), comportement identique à l'existant sur les suppressions unitaires.
