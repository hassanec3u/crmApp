"use client";

/**
 * Formulaire partagé de création / édition d'un prospect.
 *
 * Utilise react-hook-form + zod pour la validation côté client et
 * appelle la server action adaptée au submit.
 */
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  BIEN_TYPES,
  PROSPECT_SOURCES,
  TRANSACTION_TYPES,
} from "@/lib/constants";
import {
  prospectSchema,
  type ProspectFormValues,
} from "@/lib/validators/prospect";
import { createProspect, updateProspect } from "@/lib/actions/prospects";

interface ProspectFormProps {
  /** Valeurs initiales (en mode édition). */
  defaultValues?: ProspectFormValues & { id?: string };
  /** Statuts disponibles pour le select. */
  statuts: { id: string; label: string; couleur: string }[];
  /** Tags disponibles (sélection multi). */
  tags: { id: string; label: string; couleur: string }[];
  /** `true` si on est en mode édition. */
  isEdit?: boolean;
}

export function ProspectForm({
  defaultValues,
  statuts,
  tags,
  isEdit = false,
}: ProspectFormProps): JSX.Element {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<ProspectFormValues>({
    resolver: zodResolver(prospectSchema),
    defaultValues: defaultValues ?? {
      nom: "",
      prenom: "",
      telephone: "",
      email: "",
      source: "",
      statutId: "",
      notes: "",
      tagIds: [],
      criteres: {},
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const selectedTagIds = watch("tagIds") ?? [];

  /** Chaîne affichée dans l'input villes (en BDD c'est un tableau). */
  const villesRaw = watch("criteres.villes");
  const villesInputValue = Array.isArray(villesRaw)
    ? villesRaw.join(", ")
    : typeof villesRaw === "string"
      ? villesRaw
      : "";

  function toggleTag(tagId: string): void {
    const current = selectedTagIds;
    const next = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    setValue("tagIds", next, { shouldDirty: true });
  }

  async function onSubmit(data: ProspectFormValues): Promise<void> {
    const result = isEdit && defaultValues?.id
      ? await updateProspect({ ...data, id: defaultValues.id })
      : await createProspect(data);

    if (result.ok) {
      toast({
        variant: "success",
        title: isEdit ? "Prospect modifié" : "Prospect créé",
        description: `${data.prenom ? data.prenom + " " : ""}${data.nom} a été ${isEdit ? "mis à jour" : "ajouté"}.`,
      });
      router.push(isEdit ? `/prospects/${defaultValues?.id}` : "/prospects");
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: result.error,
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Informations principales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="nom">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input id="nom" {...register("nom")} placeholder="Dupont" />
            {errors.nom && (
              <p className="text-xs text-destructive">{errors.nom.message}</p>
            )}
          </div>

          {/* Prénom */}
          <div className="space-y-2">
            <Label htmlFor="prenom">Prénom</Label>
            <Input id="prenom" {...register("prenom")} placeholder="Jean" />
            {errors.prenom && (
              <p className="text-xs text-destructive">{errors.prenom.message}</p>
            )}
          </div>

          {/* Téléphone */}
          <div className="space-y-2">
            <Label htmlFor="telephone">Téléphone</Label>
            <Input
              id="telephone"
              type="tel"
              inputMode="tel"
              {...register("telephone")}
              placeholder="06 12 34 56 78"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              {...register("email")}
              placeholder="jean.dupont@email.com"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label>Source du lead</Label>
            <Select
              value={watch("source") ?? ""}
              onValueChange={(v) => setValue("source", v as typeof PROSPECT_SOURCES[number], { shouldDirty: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {PROSPECT_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Statut initial */}
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select
              value={watch("statutId") ?? ""}
              onValueChange={(v) =>
                setValue("statutId", v, { shouldDirty: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucun statut" />
              </SelectTrigger>
              <SelectContent>
                {statuts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: s.couleur }}
                      />
                      {s.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Critères immobiliers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Critères immobiliers</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Transaction */}
          <div className="space-y-2">
            <Label>Type de transaction</Label>
            <Select
              value={watch("criteres.transaction") ?? ""}
              onValueChange={(v) =>
                setValue(
                  "criteres.transaction",
                  v as "achat" | "location" | "investissement",
                  { shouldDirty: true },
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type de bien */}
          <div className="space-y-2">
            <Label>Type de bien</Label>
            <Select
              value={watch("criteres.type") ?? ""}
              onValueChange={(v) =>
                setValue(
                  "criteres.type",
                  v as "appartement" | "maison" | "terrain" | "local" | "immeuble",
                  { shouldDirty: true },
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {BIEN_TYPES.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget min */}
          <div className="space-y-2">
            <Label htmlFor="budgetMin">Budget min</Label>
            <Input
              id="budgetMin"
              type="number"
              inputMode="numeric"
              {...register("criteres.budgetMin", { valueAsNumber: true })}
              placeholder="200 000"
            />
          </div>

          {/* Budget max */}
          <div className="space-y-2">
            <Label htmlFor="budgetMax">Budget max</Label>
            <Input
              id="budgetMax"
              type="number"
              inputMode="numeric"
              {...register("criteres.budgetMax", { valueAsNumber: true })}
              placeholder="350 000"
            />
          </div>

          {/* Surface min */}
          <div className="space-y-2">
            <Label htmlFor="surfaceMin">Surface min (m²)</Label>
            <Input
              id="surfaceMin"
              type="number"
              inputMode="numeric"
              {...register("criteres.surfaceMin", { valueAsNumber: true })}
              placeholder="50"
            />
          </div>

          {/* Ville — affichage texte, stockage tableau (évite .split sur un array en édition) */}
          <div className="space-y-2">
            <Label htmlFor="villes">Villes (séparées par des virgules)</Label>
            <Input
              id="villes"
              value={villesInputValue}
              onChange={(e) => {
                const raw = e.target.value;
                setValue(
                  "criteres.villes",
                  raw
                    ? raw
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : undefined,
                  { shouldDirty: true },
                );
              }}
              placeholder="Lyon, Villeurbanne"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tags</CardTitle>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun tag disponible. Vous pourrez en créer depuis la fiche prospect.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      selected
                        ? "border-transparent text-white"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                    style={
                      selected
                        ? { backgroundColor: tag.couleur }
                        : undefined
                    }
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register("notes")}
            placeholder="Notes internes..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Enregistrer" : "Créer le prospect"}
        </Button>
      </div>
    </form>
  );
}
