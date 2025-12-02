import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, FileText, Euro, FolderOpen, Loader2 } from "lucide-react";
import { PeriodSelector } from "@/apogee-connect/components/filters/PeriodSelector";
import { useFilters } from "@/apogee-connect/contexts/FiltersContext";
import { DataService } from "@/apogee-connect/services/dataService";
import { calculateCaJour, calculateDevisJour, calculateDossiersJour } from "@/apogee-connect/utils/dashboardCalculations";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { parseISO, isWithinInterval } from "date-fns";

interface AgencyStatsTabProps {
  agencySlug: string;
}

export function AgencyStatsTab({ agencySlug }: AgencyStatsTabProps) {
  const { filters } = useFilters();
  const { isAgencyReady } = useAgency();

  const { data, isLoading } = useQuery({
    queryKey: ['franchiseur-agency-stats', agencySlug, filters.dateRange],
    queryFn: async () => {
      const allData = await DataService.loadAllData(true, false);
      
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

      // Recouvrement = somme des factures non payées (état !== 'payé')
      const recouvrement = allData.factures
        .filter((f: any) => {
          const dateEmission = f.dateEmission || f.dateReelle || f.created_at;
          if (!dateEmission) return false;
          try {
            const factureDate = parseISO(dateEmission);
            const inRange = isWithinInterval(factureDate, { 
              start: filters.dateRange.start, 
              end: filters.dateRange.end 
            });
            const typeFacture = (f.typeFacture || f.data?.type || f.state || '').toLowerCase();
            const isPaid = (f.state || f.status || f.data?.etat || '').toLowerCase().includes('pay');
            return inRange && typeFacture !== 'avoir' && !isPaid;
          } catch {
            return false;
          }
        })
        .reduce((sum: number, f: any) => {
          const montantRaw = f.totalHT || f.data?.totalHT || "0";
          const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
          return sum + (isNaN(montant) ? 0 : montant);
        }, 0);

      return {
        ca: caTotal,
        nbDossiers,
        volumeDevis: caDevis,
        recouvrement,
      };
    },
    enabled: isAgencyReady && !!agencySlug,
  });

  if (!isAgencyReady) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Chargement de vos données d'agence...</span>
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

          {/* Recouvrement */}
          <Card className="rounded-2xl border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50/50 via-white to-white hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Recouvrement (dû client)</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatEuros(data?.recouvrement || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
