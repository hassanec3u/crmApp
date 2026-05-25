/**
 * Utilitaire `cn` standard de shadcn/ui.
 *
 * Combine plusieurs noms de classes Tailwind tout en résolvant les
 * conflits (`p-2 p-4` → `p-4`).
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
