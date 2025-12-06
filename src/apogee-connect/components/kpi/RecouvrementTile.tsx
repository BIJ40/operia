import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Info } from "lucide-react";
import { useRecouvrementStats } from "@/apogee-connect/hooks/use-recouvrement-stats";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RecouvrementTileProps {
  /** Slug de l'agence cible (optionnel, utilise l'agence de l'utilisateur par défaut) */
  agencySlug?: string;
}

/**
 * Tuile KPI Recouvrement
 * 
 * Affiche le recouvrement (Total factures TTC - Total règlements reçus)
 * avec détails en tooltip
 * 
 * Convention d'interprétation :
 * - Recouvrement > 0 : reste à recouvrer (montant dû par les clients)
 * - Recouvrement = 0 : tout est recouvré (situation idéale)
 * - Recouvrement < 0 : trop-perçu (régularisation nécessaire)
 */
export function RecouvrementTile({ agencySlug }: RecouvrementTileProps = {}) {
  const { data, isLoading, error } = useRecouvrementStats({
    includeDetails: true,
    agencySlug
  });

  if (error) {
    return (
      <Card className="rounded-2xl border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50/50 via-white to-white">
        <CardContent className="p-6">
          <p className="text-sm text-destructive">Erreur de chargement</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card className="rounded-2xl border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50/50 via-white to-white">
        <CardContent className="p-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Déterminer la couleur selon le montant
  const isPositive = data.recouvrement > 0;
  const isNegative = data.recouvrement < 0;
  const colorClass = isNegative ? "text-red-600" : isPositive ? "text-orange-600" : "text-green-600";
  const bgGradient = isNegative 
    ? "from-red-50/50" 
    : isPositive 
    ? "from-orange-50/50" 
    : "from-green-50/50";
  const borderColor = isNegative
    ? "border-l-red-500"
    : isPositive
    ? "border-l-orange-500"
    : "border-l-green-500";

  return (
    <Card className={`rounded-2xl border-l-4 ${borderColor} bg-gradient-to-br ${bgGradient} via-white to-white hover:shadow-lg transition-shadow`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <TrendingUp className={`h-5 w-5 ${colorClass}`} />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">Formule :</p>
                  <p>Recouvrement = Factures TTC - Règlements reçus</p>
                  <div className="pt-2 border-t">
                    <p>Facturé : {formatEuros(data.totalFacturesTTC)}</p>
                    <p>Réglé : {formatEuros(data.totalReglementsRecus)}</p>
                  </div>
                  {data.details && (
                    <div className="pt-2 border-t text-xs text-muted-foreground">
                      <p>• {data.details.facturesPayees} facture(s) payée(s)</p>
                      <p>• {data.details.facturesEnAttente} en attente</p>
                      {data.details.avoirs > 0 && (
                        <p>• Avoirs : {formatEuros(data.details.avoirs)}</p>
                      )}
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <p className="text-xs">
                      <strong>Interprétation :</strong><br/>
                      • &gt; 0 : reste à recouvrer<br/>
                      • = 0 : tout est recouvré<br/>
                      • &lt; 0 : trop-perçu
                    </p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Recouvrement (dû client TTC)</p>
          <p className={`text-2xl font-bold ${colorClass}`}>
            {formatEuros(data.recouvrement)}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.nbFactures} facture{data.nbFactures > 1 ? 's' : ''}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
