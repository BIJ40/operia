/**
 * AgencyStatsTab - 100% StatIA
 * P1a: Tous les calculs legacy remplacés par StatIA
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Euro, FolderOpen, Loader2 } from "lucide-react";
import { PeriodSelector } from "@/apogee-connect/components/filters/PeriodSelector";
import { useFilters } from "@/apogee-connect/contexts/FiltersContext";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { logApogee } from "@/lib/logger";
import { RecouvrementTile } from "@/apogee-connect/components/kpi/RecouvrementTile";
import { getMetricForAgency } from "@/statia/api/getMetricForAgency";
import { getGlobalApogeeDataServices } from "@/statia/adapters/dataServiceAdapter";

interface AgencyStatsTabProps {
  agencySlug: string;
}

export function AgencyStatsTab({ agencySlug }: AgencyStatsTabProps) {
  const { filters } = useFilters();
  const services = getGlobalApogeeDataServices();
  
  // Ne pas charger les données pour les agences système (templates)
  const isSystemAgency = agencySlug?.startsWith('_');

  const { data, isLoading } = useQuery({
    queryKey: ['franchiseur-agency-stats-statia', agencySlug, filters.dateRange],
    queryFn: async () => {
      logApogee.debug('🎯 AgencyStatsTab - Chargement 100% StatIA', { agencySlug });
      
      const statiaParams = { dateRange: filters.dateRange };
      
      // Charger toutes les métriques via StatIA
      const [caResult, dossiersResult, devisResult] = await Promise.all([
        getMetricForAgency('ca_global_ht', agencySlug, statiaParams, services),
        getMetricForAgency('nb_dossiers_crees', agencySlug, statiaParams, services),
        getMetricForAgency('montant_devis', agencySlug, statiaParams, services),
      ]);
      
      logApogee.debug('📊 AgencyStatsTab - Métriques StatIA', {
        agencySlug,
        ca: caResult.value,
        dossiers: dossiersResult.value,
        devis: devisResult.value,
      });
      
      return {
        ca: (caResult.value as number) || 0,
        nbDossiers: (dossiersResult.value as number) || 0,
        volumeDevis: (devisResult.value as number) || 0,
      };
    },
    enabled: !!agencySlug && !isSystemAgency,
    staleTime: 5 * 60 * 1000,
  });


  // Afficher un message pour les agences système
  if (isSystemAgency) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Cette agence système ne dispose pas de statistiques Apogée.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sélecteur de période */}
      <div className="flex justify-center">
        <PeriodSelector />
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* CA */}
          <Card className="rounded-2xl border-l-4 border-l-green-500 bg-gradient-to-br from-green-50/50 via-white to-white hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Euro className="h-5 w-5 text-green-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatEuros(data?.ca || 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Nombre de dossiers */}
          <Card className="rounded-2xl border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 via-white to-white hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FolderOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Dossiers reçus</p>
                <p className="text-2xl font-bold text-blue-600">
                  {data?.nbDossiers || 0}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Volume de devis */}
          <Card className="rounded-2xl border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50/50 via-white to-white hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Volume de devis</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatEuros(data?.volumeDevis || 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recouvrement - Composant réutilisable avec agencySlug */}
          <RecouvrementTile agencySlug={agencySlug} />
        </div>
      )}
    </div>
  );
}
