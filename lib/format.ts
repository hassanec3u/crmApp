/**
 * Helpers de formatage (dates, téléphone, monnaie).
 *
 * Tous les rendus sont en français et utilisent `date-fns` avec la
 * locale `fr` pour rester cohérents sur l'application.
 */
import { format, formatDistanceToNow, isValid } from "date-fns";
import { fr } from "date-fns/locale";

/** Formate une date ISO/Date au format `JJ MMM YYYY`. */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return "—";
  return format(date, "dd MMM yyyy", { locale: fr });
}

/** Formate une date au format `JJ MMM YYYY · HH:mm`. */
export function formatDateTime(
  value: Date | string | null | undefined,
): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return "—";
  return format(date, "dd MMM yyyy · HH:mm", { locale: fr });
}

/** Rend une date relative au présent : "il y a 3 jours". */
export function formatRelative(
  value: Date | string | null | undefined,
): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return "—";
  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
}

/**
 * Formate un numéro de téléphone français pour affichage : "06 12 34 56 78".
 * Pour les numéros internationaux ou hors format, on retourne tel quel.
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }
  return raw;
}

/** Formate un montant en euros (sans décimale). */
export function formatEuros(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Retourne les initiales (max 2 caractères) d'un nom complet. */
export function getInitials(
  nom: string | null | undefined,
  prenom?: string | null,
): string {
  const a = (prenom ?? "").trim().charAt(0).toUpperCase();
  const b = (nom ?? "").trim().charAt(0).toUpperCase();
  const initials = `${a}${b}`;
  return initials || "?";
}

/**
 * Calcule une couleur de texte (noir / blanc) lisible sur un fond hex
 * donné. Utilisé pour les badges de statut colorés.
 */
export function getReadableTextColor(hex: string): "#ffffff" | "#111827" {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return "#111827";
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  // Luminance perçue (formule W3C).
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111827" : "#ffffff";
}
