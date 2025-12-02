import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Euro, FolderOpen, Loader2 } from "lucide-react";
import { PeriodSelector } from "@/apogee-connect/components/filters/PeriodSelector";
import { useFilters } from "@/apogee-connect/contexts/FiltersContext";
import { DataService } from "@/apogee-connect/services/dataService";
import { calculateCaJour, calculateDevisJour, calculateDossiersJour } from "@/apogee-connect/utils/dashboardCalculations";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { setApiBaseUrl, getApiBaseUrl } from "@/apogee-connect/services/api";
import { logApogee } from "@/lib/logger";
import { RecouvrementTile } from "@/apogee-connect/components/kpi/RecouvrementTile";

interface AgencyStatsTabProps {
  agencySlug: string;
}

export function AgencyStatsTab({ agencySlug }: AgencyStatsTabProps) {
  const { filters } = useFilters();

  const { data, isLoading } = useQuery({
    queryKey: ['franchiseur-agency-stats', agencySlug, filters.dateRange],
    queryFn: async () => {
      // 🔧 CRITICAL: Configurer temporairement l'API pour l'agence ciblée
      const originalBaseUrl = getApiBaseUrl();
      const targetBaseUrl = `https://${agencySlug}.hc-apogee.fr/api/`;
      
      logApogee.debug('🎯 AgencyStatsTab - Configuration API pour agence cible', {
        agencySlug,
        originalBaseUrl,
        targetBaseUrl
      });
      
      setApiBaseUrl(targetBaseUrl);
      
      try {
        const allData = await DataService.loadAllData(true, true); // Force refresh pour nouvelle agence
        
        logApogee.debug('📊 AgencyStatsTab - Données chargées', {
          agencySlug,
          nbFactures: allData.factures?.length || 0,
          nbProjects: allData.projects?.length || 0,
          facturesSample: allData.factures?.slice(0, 3).map(f => ({
            id: f.id,
            totalTTC: f.totalTTC,
            calc: f.calc
          }))
        });
      
      const { caTotal } = calculateCaJour(
        allData.factures,
        allData.clients,
        allData.projects,
        filters.dateRange,
        agencySlug
      );
      
      const { nbDevis, caDevis } = calculateDevisJour(
        allData.devis,
        filters.dateRange,
        agencySlug
      );
      
      const nbDossiers = calculateDossiersJour(
        allData.projects,
        filters.dateRange,
        agencySlug
      );

      return {
        ca: caTotal,
        nbDossiers,
        volumeDevis: caDevis,
      };
    } finally {
      // 🔧 Restaurer l'URL d'origine après le chargement
      logApogee.debug('🔄 AgencyStatsTab - Restauration BASE_URL originale', { originalBaseUrl });
      setApiBaseUrl(originalBaseUrl);
    }
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });


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

          {/* Recouvrement - Composant réutilisable */}
          <RecouvrementTile />
        </div>
      )}
    </div>
  );
}
