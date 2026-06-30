# TODO — CRM Immobilier

Feuille de route : état d'avancement et fonctionnalités restant à implémenter.

**Stack** : Next.js 14 (App Router) · Prisma · PostgreSQL (Supabase) · NextAuth (email/mot de passe) · Tailwind + shadcn/ui.

**Principes** : simple · rapide · mobile first · intuitif · visuellement propre · UI/UX légèrement premium.
Config métier (statuts, séquences, modèles…) éditable **sans développeur**. Indépendance technique totale (Git, base exportable, aucune plateforme fermée, code documenté FR).

---

## ✅ Déjà fait (socle « CRM manuel »)

- [x] **Fiches prospects** : nom/prénom, tél, email, source, critères immobiliers (JSON), notes internes, timeline d'historique, tags personnalisables, rappels liés.
- [x] **Pipeline / statuts** : CRUD sans développeur, réordonnancement drag & drop, couleurs.
- [x] **Tâches / rappels** : CRUD (titre, commentaire, date, heure, type, collaborateur assigné), marquer fait / reporter / modifier / supprimer, vue agenda jour + à venir.
- [x] **Dashboard** : leads du jour, rappels du jour, tâches urgentes, RDV à venir, prospects à relancer.
- [x] **Indépendance technique** : Git + PostgreSQL exportable + code documenté FR.

---

## ❌ Reste à faire (par priorité valeur / effort)

### P1 — Notifications de rappels en temps réel
Manque le plus visible au quotidien. Les rappels existent en base mais rien ne se déclenche « à l'heure dite ».
- [ ] Popup fiable au moment prévu de la tâche.
- [ ] Notification sonore activable (préférence utilisateur).
- [ ] Mécanisme : polling client léger ou Web Notifications API / Supabase Realtime ; gérer l'app fermée (Service Worker / push à terme).
- **Effort** : faible-moyen · **Aucune API externe requise.**

### P2 — Import automatique des leads Figaro
Clé API déjà disponible.
- [ ] Connexion API Figaro Immobilier (webhook ou polling selon ce que Figaro expose).
- [ ] Création automatique du prospect dès réception, classé dans un segment « Perspectives Figaro ».
- [ ] Notification immédiate, **zéro ressaisie**.
- [ ] Conserver : message original, programme demandé, date, source, historique complet (champs à ajouter au modèle `Prospect`).
- **Effort** : moyen · **Pré-requis** : doc API Figaro (format, auth, webhook vs pull).

### P3 — Séquences d'emailing automatiques
Volet « ultra important ». `nodemailer` est installé mais non utilisé.
- [ ] Moteur de séquences éditable : déclencheurs, délais, conditions, modèles, variantes.
- [ ] Variables de personnalisation (nom, programme…).
- [ ] Statistiques ouverture / clic.
- [ ] Déclencheurs cibles :
  - [ ] Nouveau lead Figaro → email immédiat.
  - [ ] J+1 après 1er appel → relance.
  - [ ] RDV visio → email la veille (confirmation + lien) + rappel 2h avant.
  - [ ] J+1 après RDV → remerciement + lien avis Google.
  - [ ] Prospect en veille → J+15 / J+30 (élargir critères ?).
  - [ ] Prospect inactif depuis X jours → relance auto.
- [ ] Extension future : **SMS** et **WhatsApp**.
- **Effort** : élevé · **Pré-requis** : provider d'envoi (SMTP/Resend/…) + worker de scheduling (cron/queue).

### P4 — Synchronisation Google Calendar
- [ ] Connexion OAuth Google Calendar (bidirectionnelle).
- [ ] RDV créé dans le CRM ou dans Google → synchro automatique.
- [ ] Déclenchement des séquences associées au RDV (lié à P3).
- **Effort** : moyen-élevé · **Pré-requis** : OAuth Google (consent screen, scopes Calendar).

### P5 — IA commerciale
Connectée à toute la base prospects.
- [ ] Lire l'historique, analyser les notes, comprendre les critères.
- [ ] Détecter perspectives chaudes / froides ; suggérer la meilleure relance.
- [ ] Générer email / SMS ; rappeler les priorités du jour.
- [ ] Exemples : « Ces perspectives sont prioritaires aujourd'hui », « Ce client n'a pas été relancé depuis X jours ».
- **Modèle recommandé** : Claude (`claude-opus-4-8` pour la qualité, `claude-haiku-4-5` pour le volume/coût).
- **Effort** : moyen-élevé (itératif) · **Pré-requis** : clé API Anthropic + prompts métier.

### P6 — Automatisations au changement de statut
- [ ] Chaque changement de statut déclenche une automatisation (email, tâche, tag…). S'appuie sur le moteur P3.
- **Effort** : faible une fois P3 en place.

---

## Notes transverses / dette à traiter
- [ ] **Sauvegardes automatiques** : à configurer côté Supabase (cahier des charges §9, non couvert par le code).
- [ ] **Vérifier le seed** : précharger les 11 statuts métier (À rappeler, Savoir si cherche toujours, Rendez-vous pris, En cours, À trouver, Vendu, Faux numéro, Att. dénonciation, Clôturé, Faire recherche, Créer une veille).
- [ ] **Scheduling** : P1/P3/P4 nécessitent des tâches planifiées (cron Vercel / worker / Supabase scheduled functions) — à choisir tôt, c'est structurant.
- [ ] **Migrations Prisma** à prévoir : champs Figaro (message original, programme), séquences/modèles/stats email, tokens OAuth Google.
