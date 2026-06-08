"use client";

/**
 * Champs de formulaire communs aux dialogues de création/édition de
 * tâche (composant contrôlé : tout l'état vit chez le parent).
 */
import type { TaskType } from "@prisma/client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_TITLE_TEMPLATES, TASK_TYPE_OPTIONS } from "@/lib/constants/tasks";
import type { AssignableUser } from "@/lib/queries/users";
import { cn } from "@/lib/utils";

interface TaskFormFieldsProps {
  idPrefix: string;
  type: TaskType;
  onTypeChange: (type: TaskType) => void;
  titre: string;
  onTitreChange: (titre: string) => void;
  date: string;
  onDateChange: (date: string) => void;
  heure: string;
  onHeureChange: (heure: string) => void;
  commentaire: string;
  onCommentaireChange: (commentaire: string) => void;
  assignedUserId: string;
  onAssignedUserIdChange: (id: string) => void;
  users: AssignableUser[];
  showAssignee?: boolean;
  showTemplates?: boolean;
}

export function TaskFormFields({
  idPrefix,
  type,
  onTypeChange,
  titre,
  onTitreChange,
  date,
  onDateChange,
  heure,
  onHeureChange,
  commentaire,
  onCommentaireChange,
  assignedUserId,
  onAssignedUserIdChange,
  users,
  showAssignee = false,
  showTemplates = false,
}: TaskFormFieldsProps): JSX.Element {
  // Suggestions de titres pré-remplis, filtrées selon le type sélectionné.
  const templates = TASK_TITLE_TEMPLATES.filter((t) => t.type === type);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-type`}>Type</Label>
        <Select value={type} onValueChange={(v) => onTypeChange(v as TaskType)}>
          <SelectTrigger id={`${idPrefix}-type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TASK_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showTemplates && templates.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {templates.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              onClick={() => {
                onTypeChange(tpl.type);
                onTitreChange(tpl.titre);
              }}
              className={cn(
                "rounded-full border bg-muted/50 px-2.5 py-1 text-xs",
                "hover:bg-muted transition-colors",
              )}
            >
              {tpl.label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-titre`}>Titre *</Label>
        <Input
          id={`${idPrefix}-titre`}
          value={titre}
          onChange={(e) => onTitreChange(e.target.value)}
          placeholder="Ex: Rappeler le prospect"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-date`}>Date *</Label>
          <Input
            id={`${idPrefix}-date`}
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-heure`}>Heure</Label>
          <Input
            id={`${idPrefix}-heure`}
            type="time"
            value={heure}
            onChange={(e) => onHeureChange(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-commentaire`}>Commentaire</Label>
        <Input
          id={`${idPrefix}-commentaire`}
          value={commentaire}
          onChange={(e) => onCommentaireChange(e.target.value)}
          placeholder="Détails optionnels"
        />
      </div>

      {showAssignee && users.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-assignee`}>Collaborateur</Label>
          <Select value={assignedUserId} onValueChange={onAssignedUserIdChange}>
            <SelectTrigger id={`${idPrefix}-assignee`}>
              <SelectValue placeholder="Choisir un agent" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
