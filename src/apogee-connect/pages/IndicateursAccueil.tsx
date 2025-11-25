import { useQuery } from "@tanstack/react-query";
import { DataService } from "@/apogee-connect/services/dataService";
import { useFilters } from "@/apogee-connect/contexts/FiltersContext";
import { useApiToggle } from "@/apogee-connect/contexts/ApiToggleContext";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, FolderOpen, ClipboardCheck, FileText, Euro } from "lucide-react";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { calculateDashboardStats } from "@/apogee-connect/utils/dashboardCalculations";
import { calculateTauxSAVGlobal } from "@/apogee-connect/utils/apporteursCalculations";
import { PeriodSelector } from "@/apogee-connect/components/filters/PeriodSelector";
import { calculateMonthlyCA } from "@/apogee-connect/utils/monthlyCalculations";
import { MonthlyCAChart } from "@/apogee-connect/components/widgets/MonthlyCAChart";

export default function IndicateursAccueil() {
  const { filters } = useFilters();
  const { isApiEnabled } = useApiToggle();
  const { agencyChangeCounter, currentAgency } = useAgency();
  const userAgency = currentAgency?.id || "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["kpis-overview", filters, isApiEnabled, agencyChangeCounter],
    enabled: !!currentAgency?.id, // Ne lancer la query que si l'agence est définie
    queryFn: async () => {
      // GUARD: Ne pas charger si l'agence n'est pas définie
      if (!currentAgency?.id) {
        console.warn('⚠️ Agence non définie - Chargement des données annulé');
        return null;
      }
      
      const apiData = await DataService.loadAllData(isApiEnabled);
      
      const stats = calculateDashboardStats({
        projects: apiData.projects || [],
        interventions: apiData.interventions || [],
        factures: apiData.factures || [],
        devis: apiData.devis || [],
        clients: apiData.clients || [],
        users: apiData.users || [],
      }, filters.dateRange);
      
      // Calculer les données mensuelles CA - année dynamique basée sur les filtres
      const start = filters.dateRange?.start;
      const year = start instanceof Date ? start.getFullYear() : new Date().getFullYear();
      const monthlyCAData = calculateMonthlyCA(
        apiData.factures || [],
        apiData.clients || [],
        apiData.projects || [],
        year,
        userAgency
      );
      
      const tauxSAVGlobal = calculateTauxSAVGlobal(
        apiData.interventions || [],
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        filters.dateRange
      );
      
      return { ...stats, monthlyCAData, tauxSAVGlobal };
    },
  });

  if (!currentAgency?.id) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <p className="text-2xl text-muted-foreground animate-pulse">Chargement de l'agence...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <p className="text-2xl text-muted-foreground animate-pulse">Chargement des indicateurs...</p>
      </div>
    );
  }

  if (error) {
    console.error('Erreur de chargement des indicateurs:', error);
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <p className="text-2xl text-muted-foreground">Erreur de chargement des données</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <p className="text-2xl text-muted-foreground">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Mes Indicateurs
        </h1>
        <PeriodSelector />
      </div>

      {/* 12 KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* KPI 1: Dossiers reçus */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-blue-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-1.5 rounded-lg">
              <FolderOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex items-center gap-1">
              {(data?.variations.dossiers || 0) > 0 ? (
                <TrendingUp className="w-2.5 h-2.5 text-green-500" />
              ) : (
                <TrendingDown className="w-2.5 h-2.5 text-red-500" />
              )}
              <span className="text-[10px] font-semibold text-muted-foreground">
                {Math.abs(data?.variations.dossiers || 0)}%
              </span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Dossiers reçus</p>
          <p className="text-xl font-bold">{data?.dossiersJour || 0}</p>
        </Card>

        {/* KPI 2: RT réalisés */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-green-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-1.5 rounded-lg">
              <ClipboardCheck className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mb-0.5">RT réalisés</p>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold">{data?.rtJour || 0}</p>
            {data?.heuresRT !== undefined && (
              <span className="text-[10px] text-muted-foreground">({data.heuresRT.toFixed(1)}h)</span>
            )}
          </div>
        </Card>

        {/* KPI 3: Devis émis */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-purple-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-1.5 rounded-lg">
              <FileText className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Devis émis</p>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold">{data?.devisJour || 0}</p>
            {data?.caDevis !== undefined && (
              <span className="text-[10px] text-muted-foreground">({formatEuros(data.caDevis)})</span>
            )}
          </div>
        </Card>

        {/* KPI 4: CA période */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-orange-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-1.5 rounded-lg">
              <Euro className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex items-center gap-1">
              {(data?.variations.ca || 0) > 0 ? (
                <TrendingUp className="w-2.5 h-2.5 text-green-500" />
              ) : (
                <TrendingDown className="w-2.5 h-2.5 text-red-500" />
              )}
              <span className="text-[10px] font-semibold text-muted-foreground">
                {Math.abs(data?.variations.ca || 0)}%
              </span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mb-0.5">CA période</p>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold">{formatEuros(data?.caJour || 0)}</p>
            {data?.nbFacturesCA !== undefined && (
              <span className="text-[10px] text-muted-foreground">({data.nbFacturesCA})</span>
            )}
          </div>
        </Card>

        {/* KPI 5: Taux de SAV */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-red-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-gradient-to-br from-red-500 to-red-600 p-1.5 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">SAV</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Taux de SAV</p>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold">{(data?.tauxSAVGlobal || 0).toFixed(1)}%</p>
          </div>
        </Card>

        {/* KPI 6-12: Placeholders */}
        {[6, 7, 8, 9, 10, 11, 12].map((num) => (
          <Card key={num} className="p-3 border-2 border-dashed border-muted">
            <p className="text-[10px] text-muted-foreground mb-0.5">KPI #{num}</p>
            <p className="text-xl font-bold text-muted-foreground">--</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">À définir</p>
          </Card>
        ))}
      </div>

      {/* Graphique CA Mensuel */}
      <div>
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Évolution du CA 2025
        </h2>
        {data?.monthlyCAData && <MonthlyCAChart data={data.monthlyCAData} />}
      </div>
    </div>
  );
}
