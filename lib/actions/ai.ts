"use server";

import type { ActionResult } from "@/lib/actions/prospects";
import { notifyAiRefresh } from "@/lib/ai/notify";
import { requireSession } from "@/lib/session";

/**
 * Déclenche le recalcul des priorités IA pour l'agent connecté.
 * Fire-and-forget : ne retourne pas le résultat du calcul (asynchrone côté
 * n8n), seulement la confirmation que la demande a été envoyée.
 */
export async function refreshAiPriorities(): Promise<
  ActionResult<{ triggered: boolean }>
> {
  const session = await requireSession();
  notifyAiRefresh(session.user.id);
  return { ok: true, data: { triggered: true } };
}
