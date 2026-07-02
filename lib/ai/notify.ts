/**
 * Déclenche fire-and-forget le recalcul des priorités IA pour un agent,
 * via le webhook n8n dédié au refresh manuel (le cron quotidien tourne
 * indépendamment côté n8n et n'a pas besoin de ce déclencheur).
 */
export function notifyAiRefresh(userId: string): void {
  const url = process.env.N8N_AI_WEBHOOK_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url) return;

  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({ userId }),
  }).catch((err: unknown) => {
    console.error("[notifyAiRefresh]", err);
  });
}
