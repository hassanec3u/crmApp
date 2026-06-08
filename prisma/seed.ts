/**
 * Seed Prisma — données initiales du CRM.
 *
 * Modes :
 *   npm run prisma:seed          → seed complet (admin + statuts + démo)
 *   npm run prisma:seed:admin    → compte admin uniquement
 *   npm run prisma:seed:full     → idem seed complet
 *
 * Variables : SEED_MODE=admin|full, SEED_ADMIN_EMAIL, SEED_ADMIN_NAME, SEED_ADMIN_PASSWORD
 *
 * Idempotent : peut être ré-exécuté sans dupliquer (upsert).
 */
import {
  HistoriqueType,
  Prisma,
  PrismaClient,
  Role,
  TaskType,
} from "@prisma/client";
import { hash } from "bcryptjs";
import {
  setHours,
  setMinutes,
  startOfDay,
  subDays,
  addDays,
} from "date-fns";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------
// Catalogue des 11 statuts métier (ordre = colonne pipeline)
// ---------------------------------------------------------------------
const DEFAULT_STATUTS: Array<{ label: string; couleur: string }> = [
  { label: "À rappeler", couleur: "#f59e0b" },
  { label: "Savoir si chercher toujours", couleur: "#eab308" },
  { label: "Rendez-vous pris", couleur: "#3b82f6" },
  { label: "En cours", couleur: "#06b6d4" },
  { label: "À trouver", couleur: "#8b5cf6" },
  { label: "Vendu", couleur: "#10b981" },
  { label: "Faux numéro", couleur: "#ef4444" },
  { label: "Att. dénonciation", couleur: "#f97316" },
  { label: "Clôturé", couleur: "#6b7280" },
  { label: "Faire recherche", couleur: "#14b8a6" },
  { label: "Créer une veille", couleur: "#ec4899" },
];

const DEFAULT_TAGS: Array<{ label: string; couleur: string }> = [
  { label: "Primo-accédant", couleur: "#3b82f6" },
  { label: "Investisseur", couleur: "#8b5cf6" },
  { label: "Urgent", couleur: "#ef4444" },
  { label: "Relance J+7", couleur: "#f59e0b" },
];

const SEED_PROSPECT_EMAIL_DOMAIN = "@seed.crm";

/** Construit une date relative (jours passés) avec heure fixe. */
function atDaysAgo(daysAgo: number, hour: number, minute = 0): Date {
  return setMinutes(setHours(subDays(new Date(), daysAgo), hour), minute);
}

/** Date de tâche : offset 0 = aujourd'hui, -2 = il y a 2 jours, +3 = dans 3 jours. */
function taskDay(offsetDays: number): Date {
  const base = offsetDays === 0 ? new Date() : addDays(new Date(), offsetDays);
  return startOfDay(base);
}

type SeedTask = {
  type?: TaskType;
  titre: string;
  /** 0 = aujourd'hui, négatif = en retard, positif = à venir */
  dayOffset: number;
  heure?: string;
  fait?: boolean;
  commentaire?: string;
};

type SeedHistorique = {
  type: HistoriqueType;
  contenu: string;
  daysAgo: number;
};

type SeedProspect = {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  source: "Figaro" | "Bouche à oreille" | "Site web" | "Autre";
  statutLabel: string;
  tagLabels?: string[];
  notes?: string;
  criteres?: Record<string, unknown>;
  /** Jours depuis la création du prospect (0 = lead du jour) */
  createdDaysAgo: number;
  createdHour: number;
  createdMinute?: number;
  tasks?: SeedTask[];
  historiques?: SeedHistorique[];
};

const SEED_PROSPECTS: SeedProspect[] = [
  // ── Leads du jour (créés aujourd'hui, heures différentes) ──
  {
    nom: "Girard",
    prenom: "Antoine",
    telephone: "06 33 44 55 66",
    email: `antoine.girard${SEED_PROSPECT_EMAIL_DOMAIN}`,
    source: "Figaro",
    statutLabel: "Savoir si chercher toujours",
    notes: "Hésite encore sur le projet — rappeler dans 2 semaines.",
    criteres: {
      transaction: "investissement",
      type: "immeuble",
      budgetMin: 800000,
      budgetMax: 1200000,
      villes: ["Lyon", "Saint-Étienne"],
    },
    createdDaysAgo: 0,
    createdHour: 8,
    createdMinute: 15,
    tasks: [
      {
        type: TaskType.RAPPEL,
        titre: "Rappeler pour confirmer le projet",
        dayOffset: 0,
        heure: "09:00",
      },
      {
        type: TaskType.RELANCE,
        titre: "Relance téléphonique",
        dayOffset: 0,
        heure: "16:10",
      },
    ],
    historiques: [
      { type: HistoriqueType.CALL, contenu: "Premier contact — intéressé mais indécis", daysAgo: 0 },
    ],
  },
  {
    nom: "Durand",
    prenom: "Émilie",
    telephone: "07 22 33 44 55",
    email: `emilie.durand${SEED_PROSPECT_EMAIL_DOMAIN}`,
    source: "Site web",
    statutLabel: "Att. dénonciation",
    tagLabels: ["Investisseur", "Relance J+7"],
    notes: "Commerce en pied d'immeuble — clientèle existante souhaitée.",
    criteres: {
      transaction: "achat",
      type: "local",
      budgetMin: 180000,
      budgetMax: 280000,
      villes: ["Bordeaux", "Mérignac"],
    },
    createdDaysAgo: 0,
    createdHour: 9,
    createdMinute: 45,
    tasks: [
      { titre: "Envoyer dossier dénonciation", dayOffset: 0, heure: "11:30" },
    ],
    historiques: [
      { type: HistoriqueType.EMAIL, contenu: "Dossier envoyé par email", daysAgo: 0 },
    ],
  },
  {
    nom: "Richard",
    prenom: "Nicolas",
    telephone: "06 44 33 22 11",
    email: `nicolas.richard${SEED_PROSPECT_EMAIL_DOMAIN}`,
    source: "Figaro",
    statutLabel: "En cours",
    tagLabels: ["Investisseur"],
    notes: "Projet de construction — terrain viabilisé.",
    createdDaysAgo: 0,
    createdHour: 11,
    createdMinute: 20,
    tasks: [
      { titre: "Préparer sélection terrains", dayOffset: 0, heure: "14:00", fait: true },
    ],
    historiques: [
      { type: HistoriqueType.NOTE, contenu: "Critères affinés après visite", daysAgo: 0 },
    ],
  },
  {
    nom: "Dubois",
    prenom: "Pierre",
    telephone: "06 98 76 54 32",
    email: `pierre.dubois${SEED_PROSPECT_EMAIL_DOMAIN}`,
    source: "Site web",
    statutLabel: "En cours",
    tagLabels: ["Relance J+7"],
    notes: "Étudiant — recherche studio ou T1.",
    createdDaysAgo: 0,
    createdHour: 14,
    createdMinute: 5,
    historiques: [
      { type: HistoriqueType.SMS, contenu: "SMS de bienvenue envoyé", daysAgo: 0 },
    ],
  },
  {
    nom: "Bernard",
    prenom: "Claire",
    telephone: "06 77 88 99 00",
    email: `claire.bernard${SEED_PROSPECT_EMAIL_DOMAIN}`,
    source: "Site web",
    statutLabel: "À trouver",
    notes: "Couple avec 2 enfants, proximité métro.",
    criteres: {
      transaction: "achat",
      type: "appartement",
      budgetMin: 250000,
      budgetMax: 310000,
      villes: ["Marseille 8e", "Marseille 9e"],
    },
    createdDaysAgo: 0,
    createdHour: 16,
    createdMinute: 30,
    tasks: [
      {
        type: TaskType.RDV,
        titre: "Visite appartement T3 Marseille 8e",
        dayOffset: 3,
        heure: "10:30",
        commentaire: "15 rue Paradis, interphone B2",
      },
    ],
    historiques: [
      { type: HistoriqueType.CALL, contenu: "Appel découverte — budget confirmé", daysAgo: 0 },
    ],
  },
  {
    nom: "Robert",
    prenom: "Isabelle",
    telephone: "07 66 55 44 33",
    email: `isabelle.robert${SEED_PROSPECT_EMAIL_DOMAIN}`,
    source: "Bouche à oreille",
    statutLabel: "Faire recherche",
    tagLabels: ["Urgent"],
    notes: "Mutation professionnelle en septembre.",
    createdDaysAgo: 0,
    createdHour: 17,
    createdMinute: 50,
    historiques: [
      { type: HistoriqueType.MEETING, contenu: "Rencontre agence — brief validé", daysAgo: 0 },
    ],
  },

  // ── Leads cette semaine (pas aujourd'hui) ──
  {
    nom: "Lefebvre",
    prenom: "Marie",
    telephone: "07 11 22 33 44",
    email: `marie.lefebvre${SEED_PROSPECT_EMAIL_DOMAIN}`,
    source: "Bouche à oreille",
    statutLabel: "Créer une veille",
    tagLabels: ["Investisseur"],
    notes: "Souhaite un bien locatif avec rendement > 5 %.",
    createdDaysAgo: 2,
    createdHour: 10,
    tasks: [
      { titre: "Relance après envoi sélection", dayOffset: -3, heure: "10:00" },
    ],
    historiques: [
      { type: HistoriqueType.EMAIL, contenu: "Sélection de 4 biens envoyée", daysAgo: 10 },
    ],
  },
  {
    nom: "Moreau",
    prenom: "Jean",
    telephone: "06 55 44 33 22",
    email: `jean.moreau${SEED_PROSPECT_EMAIL_DOMAIN}`,
    source: "Figaro",
    statutLabel: "Rendez-vous pris",
    tagLabels: ["Primo-accédant"],
    notes: "Visite maison avec jardin prévue.",
    createdDaysAgo: 3,
    createdHour: 15,
    tasks: [
      {
        type: TaskType.RDV,
        titre: "Rendez-vous visite maison Colomiers",
        dayOffset: 1,
        heure: "14:00",
        commentaire: "12 chemin des Vignes — parking visiteur",
      },
      {
        type: TaskType.RAPPEL,
        titre: "Rappel confirmation visite",
        dayOffset: 0,
        heure: "08:30",
      },
    ],
    historiques: [
      { type: HistoriqueType.MEETING, contenu: "RDV agence — critères validés", daysAgo: 3 },
    ],
  },

  // ── Prospects à relancer (dernière activité > 7 jours) ──
  {
    nom: "Martin",
    prenom: "Sophie",
    telephone: "06 12 34 56 78",
    email: `sophie.martin${SEED_PROSPECT_EMAIL_DOMAIN}`,
    source: "Figaro",
    statutLabel: "À rappeler",
    tagLabels: ["Primo-accédant", "Urgent"],
    notes: "Cherche un T3 avec balcon, Presqu'île ou Part-Dieu.",
    criteres: {
      transaction: "achat",
      type: "appartement",
      budgetMin: 280000,
      budgetMax: 350000,
      villes: ["Lyon", "Villeurbanne"],
    },
    createdDaysAgo: 25,
    createdHour: 9,
    tasks: [
      { titre: "Rappeler pour nouvelles annonces", dayOffset: -5, heure: "09:30" },
      { titre: "Relance email sélection T3", dayOffset: -2, heure: "15:00" },
    ],
    historiques: [
      { type: HistoriqueType.CALL, contenu: "Pas de réponse — messagerie", daysAgo: 12 },
    ],
  },
  {
    nom: "Petit",
    prenom: "Thomas",
    telephone: "06 00 11 22 33",
    email: `thomas.petit${SEED_PROSPECT_EMAIL_DOMAIN}`,
    source: "Autre",
    statutLabel: "Faux numéro",
    notes: "Numéro injoignable — à archiver.",
    createdDaysAgo: 40,
    createdHour: 11,
    historiques: [
      { type: HistoriqueType.CALL, contenu: "3 appels sans réponse", daysAgo: 35 },
    ],
  },

  // ── RDV aujourd'hui + tâche en retard supplémentaire ──
  {
    nom: "Lambert",
    prenom: "Camille",
    telephone: "06 21 43 65 87",
    email: `camille.lambert${SEED_PROSPECT_EMAIL_DOMAIN}`,
    source: "Figaro",
    statutLabel: "Rendez-vous pris",
    tagLabels: ["Primo-accédant"],
    notes: "Premier achat — visio ou agence.",
    createdDaysAgo: 5,
    createdHour: 14,
    tasks: [
      {
        type: TaskType.RDV,
        titre: "RDV signature compromis",
        dayOffset: 0,
        heure: "17:00",
        commentaire: "Visio Google Meet — lien envoyé par email",
      },
      { titre: "Préparer dossier compromis", dayOffset: -1, heure: "11:00" },
    ],
    historiques: [
      { type: HistoriqueType.MEETING, contenu: "Visite réussie — offre acceptée", daysAgo: 4 },
    ],
  },
  {
    nom: "Rousseau",
    prenom: "Julien",
    telephone: "07 89 12 34 56",
    email: `julien.rousseau${SEED_PROSPECT_EMAIL_DOMAIN}`,
    source: "Site web",
    statutLabel: "En cours",
    notes: "Recherche local commercial centre-ville.",
    createdDaysAgo: 14,
    createdHour: 16,
    tasks: [
      {
        titre: "Visite local commercial Bordeaux",
        dayOffset: 5,
        heure: "11:00",
        commentaire: "Rue Sainte-Catherine, entrée côté cour",
      },
    ],
    historiques: [
      { type: HistoriqueType.EMAIL, contenu: "Pas de retour depuis 2 semaines", daysAgo: 18 },
    ],
  },
];

type SeedMode = "admin" | "full";

function parseSeedMode(): SeedMode {
  const args = process.argv.slice(2);
  if (args.includes("--admin") || args.includes("admin")) return "admin";
  if (args.includes("--full") || args.includes("full")) return "full";

  const env = process.env.SEED_MODE?.trim().toLowerCase();
  if (env === "admin") return "admin";
  if (env === "full") return "full";

  return "full";
}

async function seedAdmin(): Promise<{ id: string; email: string }> {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Admin CRM";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const hashedPassword = await hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: adminName, role: Role.ADMIN, password: hashedPassword },
    create: {
      email: adminEmail,
      name: adminName,
      role: Role.ADMIN,
      password: hashedPassword,
    },
  });

  console.info(`✅ Admin prêt : ${admin.email} (id: ${admin.id})`);
  return { id: admin.id, email: admin.email };
}

async function seedStatutsAndTags(adminId: string): Promise<{
  statutByLabel: Map<string, string>;
  tagByLabel: Map<string, string>;
}> {
  for (const [index, statut] of DEFAULT_STATUTS.entries()) {
    await prisma.statut.upsert({
      where: { userId_label: { userId: adminId, label: statut.label } },
      update: { couleur: statut.couleur, ordre: index },
      create: {
        label: statut.label,
        couleur: statut.couleur,
        ordre: index,
        userId: adminId,
      },
    });
  }

  console.info(`✅ ${DEFAULT_STATUTS.length} statuts insérés.`);

  const tagByLabel = new Map<string, string>();

  for (const tag of DEFAULT_TAGS) {
    const row = await prisma.tag.upsert({
      where: { userId_label: { userId: adminId, label: tag.label } },
      update: { couleur: tag.couleur },
      create: { label: tag.label, couleur: tag.couleur, userId: adminId },
    });
    tagByLabel.set(tag.label, row.id);
  }

  console.info(`✅ ${DEFAULT_TAGS.length} tags insérés.`);

  const statutRows = await prisma.statut.findMany({
    where: { userId: adminId },
    select: { id: true, label: true },
  });
  const statutByLabel = new Map(statutRows.map((s) => [s.label, s.id]));

  return { statutByLabel, tagByLabel };
}

async function seedDemoProspects(
  adminId: string,
  statutByLabel: Map<string, string>,
  tagByLabel: Map<string, string>,
): Promise<void> {
  let prospectsCreated = 0;
  let prospectsUpdated = 0;
  let tasksCreated = 0;
  let historiquesCreated = 0;

  for (const prospect of SEED_PROSPECTS) {
    const statutId = statutByLabel.get(prospect.statutLabel) ?? null;
    const tagIds = (prospect.tagLabels ?? [])
      .map((label) => tagByLabel.get(label))
      .filter((id): id is string => id !== undefined);

    const createdAt = atDaysAgo(
      prospect.createdDaysAgo,
      prospect.createdHour,
      prospect.createdMinute ?? 0,
    );

    const baseData = {
      nom: prospect.nom,
      prenom: prospect.prenom,
      telephone: prospect.telephone,
      email: prospect.email,
      source: prospect.source,
      statutId,
      notes: prospect.notes ?? null,
      criteres:
        prospect.criteres !== undefined
          ? (prospect.criteres as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      userId: adminId,
      createdAt,
      updatedAt: createdAt,
    };

    const existing = await prisma.prospect.findFirst({
      where: { userId: adminId, email: prospect.email },
      select: { id: true },
    });

    let prospectId: string;

    if (existing) {
      await prisma.prospect.update({
        where: { id: existing.id },
        data: {
          ...baseData,
          tags: { set: tagIds.map((id) => ({ id })) },
        },
      });
      prospectId = existing.id;
      prospectsUpdated += 1;
    } else {
      const created = await prisma.prospect.create({
        data: {
          ...baseData,
          ...(tagIds.length > 0
            ? { tags: { connect: tagIds.map((id) => ({ id })) } }
            : {}),
        },
      });
      prospectId = created.id;
      prospectsCreated += 1;
    }

    // Réinitialise tâches / historiques de démo pour idempotence
    await prisma.task.deleteMany({ where: { prospectId } });
    await prisma.historiqueAction.deleteMany({ where: { prospectId } });

    for (const task of prospect.tasks ?? []) {
      await prisma.task.create({
        data: {
          type: task.type ?? TaskType.RAPPEL,
          titre: task.titre,
          commentaire: task.commentaire ?? null,
          date: taskDay(task.dayOffset),
          heure: task.heure ?? null,
          fait: task.fait ?? false,
          prospectId,
          assignedUserId: adminId,
        },
      });
      tasksCreated += 1;
    }

    for (const hist of prospect.historiques ?? []) {
      await prisma.historiqueAction.create({
        data: {
          type: hist.type,
          contenu: hist.contenu,
          prospectId,
          userId: adminId,
          createdAt: atDaysAgo(hist.daysAgo, 10, 0),
        },
      });
      historiquesCreated += 1;
    }
  }

  console.info(
    `✅ ${SEED_PROSPECTS.length} prospects : ${prospectsCreated} créé(s), ${prospectsUpdated} mis à jour.`,
  );
  console.info(`✅ ${tasksCreated} tâches, ${historiquesCreated} entrées d'historique.`);
}

async function main(): Promise<void> {
  const mode = parseSeedMode();
  console.info(`🌱 Démarrage du seed (mode: ${mode})…`);

  const admin = await seedAdmin();

  if (mode === "admin") {
    console.info("🎉 Seed admin terminé — aucune donnée de démo chargée.");
    console.info(
      "   Pour les statuts, tags et prospects de démo : npm run prisma:seed:full",
    );
    return;
  }

  const { statutByLabel, tagByLabel } = await seedStatutsAndTags(admin.id);
  await seedDemoProspects(admin.id, statutByLabel, tagByLabel);

  console.info("🎉 Seed complet terminé — dashboard avec données hétérogènes.");
}

main()
  .catch((error) => {
    console.error("❌ Échec du seed :", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
