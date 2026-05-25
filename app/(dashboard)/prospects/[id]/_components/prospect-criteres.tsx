"use client";

import { Home, DollarSign, Maximize, MapPin } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuros } from "@/lib/format";
import type { ProspectCriteres as CriteresType } from "@/types/prospect";
import { BIEN_TYPES, TRANSACTION_TYPES } from "@/lib/constants";

interface Props {
  criteres: Prisma.JsonValue;
}

export function ProspectCriteres({ criteres }: Props): JSX.Element {
  const data = (criteres as CriteresType | null) ?? {};
  const isEmpty = Object.keys(data).length === 0;

  if (isEmpty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Critères immobiliers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucun critère renseigné.</p>
        </CardContent>
      </Card>
    );
  }

  const transLabel =
    TRANSACTION_TYPES.find((t) => t.value === data.transaction)?.label ??
    data.transaction;
  const bienLabel =
    BIEN_TYPES.find((b) => b.value === data.type)?.label ?? data.type;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Critères immobiliers</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
        {transLabel && (
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-muted-foreground" />
            <span>Transaction : <strong>{transLabel}</strong></span>
          </div>
        )}
        {bienLabel && (
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-muted-foreground" />
            <span>Type : <strong>{bienLabel}</strong></span>
          </div>
        )}
        {(data.budgetMin !== undefined || data.budgetMax !== undefined) && (
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>
              Budget :{" "}
              <strong>
                {data.budgetMin !== undefined ? formatEuros(data.budgetMin) : "—"}
                {" → "}
                {data.budgetMax !== undefined ? formatEuros(data.budgetMax) : "—"}
              </strong>
            </span>
          </div>
        )}
        {(data.surfaceMin !== undefined || data.surfaceMax !== undefined) && (
          <div className="flex items-center gap-2">
            <Maximize className="h-4 w-4 text-muted-foreground" />
            <span>
              Surface :{" "}
              <strong>
                {data.surfaceMin ?? "—"} — {data.surfaceMax ?? "—"} m²
              </strong>
            </span>
          </div>
        )}
        {data.pieces !== undefined && (
          <div>Pièces : <strong>{data.pieces}+</strong></div>
        )}
        {data.villes && data.villes.length > 0 && (
          <div className="flex items-center gap-2 sm:col-span-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>Villes : <strong>{data.villes.join(", ")}</strong></span>
          </div>
        )}
        {data.exterieur && <div>Extérieur souhaité</div>}
        {data.parking && <div>Parking requis</div>}
        {data.remarques && (
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">{data.remarques}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
