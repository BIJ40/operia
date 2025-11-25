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
      
      // Calculer le délai moyen Dossier → Facture (NON soumis au sélecteur temporel)
      const { calculateDelaiMoyenDossierFacture, calculateTauxDossiersComplexes, calculatePanierMoyen, calculateTauxTransformationDevis } = await import("@/apogee-connect/utils/dashboardCalculations");
      const delaiDossierFacture = calculateDelaiMoyenDossierFacture(
        apiData.factures || [],
        apiData.projects || [],
        undefined // Pas de filtre période
      );
      
      // Calculer le taux de dossiers complexes
      const dossiersComplexes = calculateTauxDossiersComplexes(
        apiData.interventions || [],
        filters.dateRange
      );
      
      // Calculer le panier moyen
      const panierMoyen = calculatePanierMoyen(
        apiData.factures || [],
        filters.dateRange
      );
      
      // Calculer le taux de transformation des devis
      const tauxTransformationDevis = calculateTauxTransformationDevis(
        apiData.devis || [],
        filters.dateRange
      );
      
      // Calculer le nombre moyen d'interventions par dossier
      const { calculateNbMoyenInterventionsParDossier, calculateNbMoyenVisitesParIntervention } = await import("@/apogee-connect/utils/dashboardCalculations");
      const nbMoyenInterventionsParDossier = calculateNbMoyenInterventionsParDossier(
        apiData.interventions || [],
        filters.dateRange
      );
      
      // Calculer le nombre moyen de visites par intervention
      const nbMoyenVisitesParIntervention = calculateNbMoyenVisitesParIntervention(
        apiData.interventions || [],
        filters.dateRange
      );
      
      // Calculer le taux de dossiers multi-univers
      const { calculateTauxDossiersMultiUnivers, calculateTauxDossiersSansDevis } = await import("@/apogee-connect/utils/dashboardCalculations");
      const tauxDossiersMultiUnivers = calculateTauxDossiersMultiUnivers(
        apiData.projects || [],
        filters.dateRange
      );
      
      // Calculer le taux de dossiers sans devis
      const tauxDossiersSansDevis = calculateTauxDossiersSansDevis(
        apiData.projects || [],
        apiData.factures || [],
        apiData.devis || [],
        filters.dateRange
      );
      
      // Calculer le taux de dossiers multi-techniciens
      const { calculateTauxDossiersMultiTechniciens, calculatePolyvalenceTechniciens } = await import("@/apogee-connect/utils/dashboardCalculations");
      const tauxDossiersMultiTechniciens = calculateTauxDossiersMultiTechniciens(
        apiData.interventions || [],
        filters.dateRange
      );
      
      // Calculer la polyvalence réelle des techniciens (historique complet, NON filtré par période)
      const polyvalenceTechniciens = calculatePolyvalenceTechniciens(
        apiData.interventions || [],
        apiData.projects || [],
        apiData.users || []
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
      
      return { ...stats, monthlyCAData, tauxSAVGlobal, delaiDossierFacture, dossiersComplexes, panierMoyen, tauxTransformationDevis, nbMoyenInterventionsParDossier, nbMoyenVisitesParIntervention, tauxDossiersMultiUnivers, tauxDossiersSansDevis, tauxDossiersMultiTechniciens, polyvalenceTechniciens };
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

        {/* KPI 6: Dossiers complexes */}
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

        {/* KPI 7: Panier moyen */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-pink-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-1.5 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">🛒</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Panier moyen</p>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold">{formatEuros(data?.panierMoyen?.panierMoyen || 0)}</p>
            {data?.panierMoyen?.nbDossiers !== undefined && (
              <span className="text-[10px] text-muted-foreground">({data.panierMoyen.nbDossiers})</span>
            )}
          </div>
        </Card>

        {/* KPI 8: Taux de transformation */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-cyan-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 p-1.5 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">📈</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Taux transfo devis</p>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold">{data?.tauxTransformationDevis?.tauxTransformation || 0}%</p>
            {data?.tauxTransformationDevis?.nbAcceptes !== undefined && (
              <span className="text-[10px] text-muted-foreground">({data.tauxTransformationDevis.nbAcceptes}/{data.tauxTransformationDevis.nbEnvoyes})</span>
            )}
          </div>
        </Card>

        {/* KPI 9: Délai moyen (NON soumis au filtre période) */}
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

        {/* KPI 10: Nb Moyen Interventions/Dossier */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-amber-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-1.5 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">📊</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Nb moyen RDV/Dossier</p>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold">{data?.nbMoyenInterventionsParDossier?.nbMoyen || 0}</p>
            {data?.nbMoyenInterventionsParDossier?.nbProjets !== undefined && (
              <span className="text-[10px] text-muted-foreground">({data.nbMoyenInterventionsParDossier.nbProjets})</span>
            )}
          </div>
        </Card>

        {/* KPI 11: Nb Moyen Visites/Intervention */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-lime-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-lime-500 to-lime-600 p-1.5 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">📍</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Nb moyen visites/RDV</p>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold">{data?.nbMoyenVisitesParIntervention?.nbMoyen || 0}</p>
            {data?.nbMoyenVisitesParIntervention?.nbInterventions !== undefined && (
              <span className="text-[10px] text-muted-foreground">({data.nbMoyenVisitesParIntervention.nbInterventions})</span>
            )}
          </div>
        </Card>

        {/* KPI 12: Taux Multi-Univers */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-violet-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-violet-500 to-violet-600 p-1.5 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">🌐</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Multi-univers</p>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold">{data?.tauxDossiersMultiUnivers?.tauxMultiUnivers || 0}%</p>
            {data?.tauxDossiersMultiUnivers?.nbMultiUnivers !== undefined && (
              <span className="text-[10px] text-muted-foreground">({data.tauxDossiersMultiUnivers.nbMultiUnivers}/{data.tauxDossiersMultiUnivers.nbTotal})</span>
            )}
          </div>
        </Card>

        {/* KPI 13: Taux Sans Devis */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-rose-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-1.5 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">⚡</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Sans devis</p>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold">{data?.tauxDossiersSansDevis?.tauxSansDevis || 0}%</p>
            {data?.tauxDossiersSansDevis?.nbSansDevis !== undefined && (
              <span className="text-[10px] text-muted-foreground">({data.tauxDossiersSansDevis.nbSansDevis}/{data.tauxDossiersSansDevis.nbFactures})</span>
            )}
          </div>
        </Card>

        {/* KPI 14: Taux Multi-Techniciens */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-sky-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-sky-500 to-sky-600 p-1.5 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">👥</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Multi-techniciens</p>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold">{data?.tauxDossiersMultiTechniciens?.tauxMultiTech || 0}%</p>
            {data?.tauxDossiersMultiTechniciens?.nbMultiTech !== undefined && (
              <span className="text-[10px] text-muted-foreground">({data.tauxDossiersMultiTechniciens.nbMultiTech}/{data.tauxDossiersMultiTechniciens.nbTotal})</span>
            )}
          </div>
        </Card>

        {/* KPI 15: Polyvalence Techniciens (historique complet) */}
        <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-emerald-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-1.5 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">🎯</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Polyvalence tech</p>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold">{data?.polyvalenceTechniciens?.polyvalenceMoyenne || 0}</p>
            {data?.polyvalenceTechniciens?.nbTechniciens !== undefined && (
              <span className="text-[10px] text-muted-foreground">({data.polyvalenceTechniciens.nbTechniciens} techs)</span>
            )}
          </div>
        </Card>
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
