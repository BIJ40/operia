import { useQuery } from "@tanstack/react-query";
import { DataService } from "@/apogee-connect/services/dataService";
import { useFilters } from "@/apogee-connect/contexts/FiltersContext";
import { useApiToggle } from "@/apogee-connect/contexts/ApiToggleContext";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { Card } from "@/components/ui/card";
import { FolderOpen, ClipboardCheck, FileText, Euro } from "lucide-react";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { calculateDashboardStats } from "@/apogee-connect/utils/dashboardCalculations";
import { calculateTauxSAVGlobal } from "@/apogee-connect/utils/apporteursCalculations";
import { PeriodSelector } from "@/apogee-connect/components/filters/PeriodSelector";
import { calculateMonthlyCA } from "@/apogee-connect/utils/monthlyCalculations";
import { MonthlyCAChart } from "@/apogee-connect/components/widgets/MonthlyCAChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function IndicateursAccueil() {
  const { filters } = useFilters();
  const { isApiEnabled } = useApiToggle();
  const { agencyChangeCounter, currentAgency, isAgencyReady } = useAgency();
  const userAgency = currentAgency?.id || "";
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  const { data, isLoading, error } = useQuery({
    queryKey: ["kpis-overview", filters, isApiEnabled, agencyChangeCounter, selectedYear],
    enabled: isAgencyReady && isApiEnabled,
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
      }, filters.dateRange, userAgency);
      
      // Calculer le délai moyen Dossier → Facture
      const { calculateDelaiMoyenDossierFacture, calculateTauxDossiersComplexes } = await import("@/apogee-connect/utils/dashboardCalculations");
      const delaiDossierFacture = calculateDelaiMoyenDossierFacture(
        apiData.factures || [],
        apiData.projects || [],
        filters.dateRange
      );
      
      // Calculer le taux de dossiers complexes
      const dossiersComplexes = calculateTauxDossiersComplexes(
        apiData.interventions || [],
        filters.dateRange
      );
      
      // Calculer les données mensuelles CA pour l'année sélectionnée
      const monthlyCAData = calculateMonthlyCA(
        apiData.factures || [],
        apiData.clients || [],
        apiData.projects || [],
        selectedYear,
        userAgency
      );
      
      const tauxSAVGlobal = calculateTauxSAVGlobal(
        apiData.interventions || [],
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        filters.dateRange
      );
      
      return { ...stats, monthlyCAData, tauxSAVGlobal, delaiDossierFacture, dossiersComplexes };
    },
  });

  if (!isAgencyReady) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <p className="text-2xl text-muted-foreground animate-pulse">Chargement de vos données d'agence...</p>
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
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-1.5 rounded-lg">
              <FolderOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Dossiers reçus</p>
          </div>
          <p className="text-xl font-bold">{data?.dossiersJour || 0}</p>
        </Card>

        {/* KPI 2: RT réalisés */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-green-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-1.5 rounded-lg">
              <ClipboardCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">RT réalisés</p>
          </div>
          <p className="text-xl font-bold">{data?.rtJour || 0}</p>
        </Card>

        {/* KPI 3: Devis émis */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-purple-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-1.5 rounded-lg">
              <FileText className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Devis émis</p>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold">{data?.devisJour || 0}</p>
            {data?.caDevis !== undefined && (
              <span className="text-[10px] text-muted-foreground">({formatEuros(data.caDevis)})</span>
            )}
          </div>
        </Card>

        {/* KPI 4: CA période */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-orange-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-1.5 rounded-lg">
              <Euro className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">CA période</p>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold">{formatEuros(data?.caJour || 0)}</p>
            {data?.nbFacturesCA !== undefined && (
              <span className="text-[10px] text-muted-foreground">({data.nbFacturesCA})</span>
            )}
          </div>
        </Card>

        {/* KPI 5: Taux de SAV */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-red-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-red-500 to-red-600 p-1.5 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">SAV</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Taux de SAV</p>
          </div>
          <p className="text-xl font-bold">{(data?.tauxSAVGlobal || 0).toFixed(1)}%</p>
        </Card>

        {/* KPI 6: Délai moyen Dossier → Facture */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-teal-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-1.5 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">⏱️</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Délai moyen d'un dossier</p>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold">{data?.delaiDossierFacture?.delaiMoyen || 0}j</p>
            {data?.delaiDossierFacture?.nbFactures !== undefined && (
              <span className="text-[10px] text-muted-foreground">({data.delaiDossierFacture.nbFactures})</span>
            )}
          </div>
        </Card>

        {/* KPI 7: Dossiers complexes */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-indigo-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-1.5 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">📊</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Dossiers complexes</p>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold">{data?.dossiersComplexes?.tauxComplexite || 0}%</p>
            {data?.dossiersComplexes?.nbComplexes !== undefined && (
              <span className="text-[10px] text-muted-foreground">({data.dossiersComplexes.nbComplexes}/{data.dossiersComplexes.nbTotal})</span>
            )}
          </div>
        </Card>

        {/* KPI 8-12: Placeholders */}
        {[8, 9, 10, 11, 12].map((num) => (
          <Card key={num} className="p-3 border-2 border-dashed border-muted">
            <p className="text-[10px] text-muted-foreground mb-0.5">KPI #{num}</p>
            <p className="text-xl font-bold text-muted-foreground">--</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">À définir</p>
          </Card>
        ))}
      </div>

      {/* Graphique CA Mensuel */}
      <div>
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            Évolution du CA
          </h2>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-[120px] bg-gradient-to-r from-primary to-helpconfort-blue-dark text-white border-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border z-50">
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {data?.monthlyCAData && <MonthlyCAChart data={data.monthlyCAData} />}
      </div>
    </div>
  );
}
