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
| `npm run prisma:migrate`  | Crée/applique une migration en dev                       |
| `npm run prisma:deploy`   | Applique les migrations en production                    |
| `npm run prisma:studio`   | Ouvre Prisma Studio                                      |
| `npm run prisma:seed`     | Lance `prisma/seed.ts`                                   |
| `npm run db:reset`        | Reset complet de la base + reseed (⚠️ destructif)        |

## Déploiement Vercel

1. Pusher le repo sur GitHub.
2. Importer le projet dans Vercel.
3. Renseigner les variables d'environnement (mêmes clés que `.env.example`).
4. Vercel exécutera automatiquement `npm run build` (qui inclut `prisma generate`).
5. Lancer une première fois `npx prisma migrate deploy` depuis votre machine (avec `DATABASE_URL` pointant sur Supabase) **ou** ajouter `prisma migrate deploy` au script `build`.

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
