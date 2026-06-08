# CRM Immobilier

CRM mobile-first pour agents immobiliers — **Next.js 14 + Prisma + Supabase**.

## Stack

- **Next.js 14** (App Router, Server Components, Server Actions)
- **TypeScript** strict
- **Tailwind CSS** + **shadcn/ui**
- **PostgreSQL** (Supabase) + **Prisma ORM**
- **NextAuth.js v4** — connexion email + mot de passe (Credentials)
- **Hébergement** : Vercel

## Structure du projet

```
crmApp/
├── app/                              # App Router (routes, layouts, pages)
│   ├── (dashboard)/                  # Groupe de routes authentifiées
│   │   └── dashboard/page.tsx
│   ├── api/
│   │   └── auth/[...nextauth]/route.ts
│   ├── login/
│   │   ├── page.tsx                  # Écran de connexion
│   │   └── error/page.tsx            # Erreurs d'auth
│   ├── globals.css                   # Tokens shadcn + base Tailwind
│   ├── layout.tsx                    # Layout racine (HTML, providers)
│   └── page.tsx                      # Redirection /
├── components/
│   ├── providers/
│   │   └── auth-provider.tsx         # SessionProvider client
│   └── ui/                           # Composants shadcn/ui (à générer)
├── lib/
│   ├── auth.ts                       # Config NextAuth (providers, callbacks)
│   ├── env.ts                        # Validation des variables d'env (zod)
│   ├── prisma.ts                     # Client Prisma singleton
│   ├── session.ts                    # Helpers serveur (getServerSession…)
│   └── utils.ts                      # `cn()` shadcn
├── prisma/
│   ├── schema.prisma                 # Modèles (User, Prospect, Statut…)
│   └── seed.ts                       # Admin + 11 statuts métier
├── types/
│   ├── next-auth.d.ts                # Augmentation Session/User
│   └── prospect.ts                   # Type ProspectCriteres
├── middleware.ts                     # Garde d'authentification globale
├── components.json                   # Config shadcn/ui
├── tailwind.config.ts
├── postcss.config.js
├── next.config.mjs
├── tsconfig.json
├── package.json
├── .env.example
└── .gitignore
```

## Démarrage rapide

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer l'environnement

```bash
cp .env.example .env
```

Renseigner :

- `DATABASE_URL` et `DIRECT_URL` (Supabase → Project Settings → Database)
- `NEXTAUTH_SECRET` : `openssl rand -base64 32`
- `SEED_ADMIN_PASSWORD` (mot de passe admin créé par le seed, défaut : `admin123`)

### 3. Préparer la base de données

```bash
npm run prisma:migrate    # Crée et applique la migration initiale
npm run prisma:seed       # Crée l'admin + les 11 statuts métier
```

Voir [Base de données — commandes terminal](#base-de-données--commandes-terminal) pour le détail de chaque commande.

### 4. Lancer le serveur de dev

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Scripts utiles

| Script                    | Description                                              |
| ------------------------- | -------------------------------------------------------- |
| `npm run dev`             | Démarre Next.js en mode dev                              |
| `npm run build`           | Build production (génère le client Prisma au passage)    |
| `npm run start`           | Démarre le serveur en mode production                    |
| `npm run lint`            | Lint via ESLint                                          |
| `npm run typecheck`       | Vérifie le typage TypeScript                             |
| `npm run prisma:generate` | Régénère le client Prisma (`@prisma/client`)             |
| `npm run prisma:migrate`  | Crée/applique une migration en dev                       |
| `npm run prisma:deploy`   | Applique les migrations en production                    |
| `npm run prisma:studio`   | Ouvre Prisma Studio                                      |
| `npm run prisma:seed`     | Seed complet (admin + statuts + démo)                    |
| `npm run prisma:seed:full`| Idem seed complet                                        |
| `npm run prisma:seed:admin` | Compte admin uniquement                                |
| `npm run db:reset`        | Reset complet de la base + reseed (⚠️ destructif)        |

## Base de données — commandes terminal

Prérequis : `.env` configuré avec `DATABASE_URL` (pooler, port **6543**) et `DIRECT_URL` (connexion directe, port **5432**). Les migrations utilisent `DIRECT_URL`.

### Installation et client Prisma

Le client est régénéré automatiquement après `npm install` (`postinstall`).

```bash
npm run prisma:generate
# équivalent :
npx prisma generate
```

À lancer après modification de `prisma/schema.prisma` si vous ne relancez pas `npm install` ni `npm run build`.

### Développement local

**Première installation** (base vide) :

```bash
npm run prisma:migrate
npm run prisma:seed
```

**Créer une nouvelle migration** après changement du schéma :

```bash
npm run prisma:migrate
# équivalent :
npx prisma migrate dev
# Prisma demande un nom de migration, applique le SQL, puis régénère le client.
```

**Peupler / réexécuter les données initiales** :

```bash
# Complet : admin + 11 statuts + tags + prospects de démo
npm run prisma:seed

# Admin seul (production ou base vide sans données fictives)
npm run prisma:seed:admin

# Variable d'environnement alternative
SEED_MODE=admin npm run prisma:seed
```

`npx prisma db seed` exécute le seed **complet** par défaut (`--full`).

**Explorer les données** (interface web) :

```bash
npm run prisma:studio
# équivalent :
npx prisma studio
# Ouvre http://localhost:5555
```

**Réinitialiser complètement la base** (supprime toutes les données, réapplique les migrations, relance le seed) :

```bash
npm run db:reset
# équivalent :
npx prisma migrate reset --force
```

### Production / CI (Supabase, Vercel)

**Appliquer les migrations déjà versionnées** (sans créer de nouvelle migration) :

```bash
npm run prisma:deploy
# équivalent :
npx prisma migrate deploy
```

**Vérifier l’état des migrations** sur la base cible :

```bash
npx prisma migrate status
```

Le build production inclut déjà `prisma generate` :

```bash
npm run build
```

### Commandes Prisma utiles (sans script npm)

```bash
# Valider le schéma
npx prisma validate

# Formater schema.prisma
npx prisma format

# Synchroniser le schéma sans fichier de migration (prototypage uniquement — éviter en prod)
npx prisma db push

# Tirer le schéma depuis une base existante (introspection)
npx prisma db pull
```

### Workflows courants

| Situation | Commandes |
| --------- | --------- |
| Nouveau clone du repo | `npm install` → `npm run prisma:migrate` → `npm run prisma:seed` |
| Modification de `schema.prisma` | `npm run prisma:migrate` (puis commit du dossier `prisma/migrations/`) |
| Déploiement sur Supabase | `npm run prisma:deploy` (avec `DATABASE_URL` / `DIRECT_URL` de prod dans `.env`) |
| Base locale corrompue / repartir de zéro | `npm run db:reset` |
| Données de démo uniquement | `npm run prisma:seed` |

### Variables liées au seed

Définies dans `.env` (voir `.env.example`) :

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_NAME`
- `SEED_ADMIN_PASSWORD`
- `SEED_MODE` — `full` (défaut) ou `admin` (si vous utilisez `npx prisma db seed` sans script npm)

## Déploiement Vercel

1. Pusher le repo sur GitHub.
2. Importer le projet dans Vercel.
3. Renseigner les variables d'environnement (mêmes clés que `.env.example`).
4. Vercel exécutera automatiquement `npm run build` (qui inclut `prisma generate`).
5. Appliquer les migrations sur Supabase : `npm run prisma:deploy` (avec `DATABASE_URL` et `DIRECT_URL` de production dans `.env`). Option : ajouter `prisma migrate deploy` au script `build`.

## Ajouter un composant shadcn/ui

```bash
npx shadcn-ui@latest add button input dialog
```

Les composants sont générés dans `components/ui/`.

## Modèles de données

Voir [`prisma/schema.prisma`](./prisma/schema.prisma).

### Statuts métier seedés

1. À rappeler
2. Savoir si chercher toujours
3. Rendez-vous pris
4. En cours
5. À trouver
6. Vendu
7. Faux numéro
8. Att. dénonciation
9. Clôturé
10. Faire recherche
11. Créer une veille
