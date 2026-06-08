import { revalidatePath } from "next/cache";

/** Invalide les pages qui affichent des tâches après une mutation. */
export function revalidateTaskPaths(prospectId?: string): void {
  revalidatePath("/dashboard");
  revalidatePath("/taches");
  revalidatePath("/agenda");
  if (prospectId) {
    revalidatePath(`/prospects/${prospectId}`);
  }
}
