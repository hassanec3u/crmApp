type GcalAction = "create" | "update" | "delete";

export interface GcalNotifyPayload {
  action: GcalAction;
  taskId: string;
  googleCalendarEventId?: string | null;
  titre?: string;
  date?: string;
  heure?: string | null;
  commentaire?: string | null;
  prospectNom?: string;
  prospectPrenom?: string | null;
}

export function notifyGcal(payload: GcalNotifyPayload): void {
  const url = process.env.N8N_WEBHOOK_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url) return;

  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(payload),
  }).catch((err: unknown) => {
    console.error("[notifyGcal]", err);
  });
}
