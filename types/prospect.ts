/**
 * Types partagés pour les prospects.
 *
 * `criteres` est stocké en `Json` côté Prisma : on définit ici le type
 * TypeScript canonique afin d'éviter le `any` partout dans le code.
 */

export type TransactionType = "achat" | "location" | "investissement";
export type BienType = "appartement" | "maison" | "terrain" | "local" | "immeuble";

export interface ProspectCriteres {
  /** Type de transaction recherchée. */
  transaction?: TransactionType;
  /** Type de bien recherché. */
  type?: BienType;
  budgetMin?: number;
  budgetMax?: number;
  surfaceMin?: number;
  surfaceMax?: number;
  /** Nombre de pièces minimal. */
  pieces?: number;
  /** Nombre de chambres minimal. */
  chambres?: number;
  /** Villes / secteurs visés. */
  villes?: string[];
  /** Étage minimal (appartement). */
  etageMin?: number;
  /** Présence d'extérieur souhaitée (balcon, terrasse, jardin). */
  exterieur?: boolean;
  /** Place de parking nécessaire. */
  parking?: boolean;
  /** Notes libres sur les critères. */
  remarques?: string;
}
