import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/apogee-connect/components/layout/AppLayout";
import { DataService } from "@/apogee-connect/services/dataService";
import { useFilters } from "@/apogee-connect/contexts/FiltersContext";
import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { useApiToggle } from "@/apogee-connect/contexts/ApiToggleContext";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { Card } from "@/components/ui/card";
import { 
  TrendingUp, TrendingDown, FolderOpen, ClipboardCheck, FileText, Euro,
  Clock, Target, Users, Wrench, BarChart3, Package, Layers, UserCheck, Award
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { calculateDashboardStats } from "@/apogee-connect/utils/dashboardCalculations";
import { PeriodSelector } from "@/apogee-connect/components/filters/PeriodSelector";
import { SecondaryPeriodSelector } from "@/apogee-connect/components/filters/SecondaryPeriodSelector";
import { calculateLast7DaysActivity, calculateVariationVs30Days } from "@/apogee-connect/utils/activityCalculations";
import { ActivityChart } from "@/apogee-connect/components/widgets/ActivityChart";
import { calculateMonthlyCA } from "@/apogee-connect/utils/monthlyCalculations";
import { MonthlyCAChart } from "@/apogee-connect/components/widgets/MonthlyCAChart";
import { 
  calculateTop10Apporteurs, 
  calculateDossiersConfiesParApporteur, 
  calculateDuGlobal, 
  calculatePartApporteurs,
  calculateTauxTransformationMoyen,
  calculatePanierMoyenHT,
  calculateDelaiMoyenFacturation,
  calculateTauxSAV,
  calculateTauxSAVGlobal,
  calculateFlop10Apporteurs
} from "@/apogee-connect/utils/apporteursCalculations";
import { calculateTypesApporteursStats } from "@/apogee-connect/utils/typesApporteursCalculations";
import { calculateParticuliersStats } from "@/apogee-connect/utils/particuliersCalculations";
import { calculateMonthlySegmentation } from "@/apogee-connect/utils/segmentationCalculations";
import { TopApporteursWidget } from "@/apogee-connect/components/widgets/TopApporteursWidget";
import { DossiersConfiesWidget } from "@/apogee-connect/components/widgets/DossiersConfiesWidget";
import { DuGlobalWidget } from "@/apogee-connect/components/widgets/DuGlobalWidget";
import { FlopApporteursWidget } from "@/apogee-connect/components/widgets/FlopApporteursWidget";
import { TypesApporteursWidget } from "@/apogee-connect/components/widgets/TypesApporteursWidget";
import { ParticuliersWidget } from "@/apogee-connect/components/widgets/ParticuliersWidget";
import { SegmentationChart } from "@/apogee-connect/components/widgets/SegmentationChart";

export default function Dashboard() {
  const { filters } = useFilters();
  const { filters: secondaryFilters } = useSecondaryFilters();
  const { isApiEnabled } = useApiToggle();
  const { agencyChangeCounter, currentAgency, isAgencyReady } = useAgency();
  const userAgency = currentAgency?.id || "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-stats", filters, secondaryFilters, isApiEnabled, agencyChangeCounter],
    enabled: isAgencyReady && isApiEnabled,
    queryFn: async () => {
      // GUARD: Ne pas charger si l'agence n'est pas définie
      if (!currentAgency?.id) {
        console.warn('⚠️ Agence non définie - Chargement des données annulé');
        return null;
      }
      
      const apiData = await DataService.loadAllData(isApiEnabled);
      
      // Calculer les vrais KPIs avec les données de l'API et la période sélectionnée
      const stats = calculateDashboardStats({
        projects: apiData.projects || [],
        interventions: apiData.interventions || [],
        factures: apiData.factures || [],
        devis: apiData.devis || [],
        clients: apiData.clients || [],
        users: apiData.users || [],
      }, filters.dateRange, userAgency);
      
      // Calculer les données pour le graphique d'activité (7 derniers jours)
      const activityData = calculateLast7DaysActivity(apiData.projects || []);
      const activityVariation = calculateVariationVs30Days(apiData.projects || []);
      
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
      
      // Calculer TOP 10 apporteurs - lié au filtre secondaire
      const top10Apporteurs = calculateTop10Apporteurs(
        apiData.factures || [],
        apiData.projects || [],
        apiData.devis || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      // Calculer les dossiers confiés par apporteur
      const dossiersConfiesParApporteur = calculateDossiersConfiesParApporteur(
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      // Calculer le dû global
      const duGlobal = calculateDuGlobal(
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      // Calculer la part des apporteurs
      const partApporteurs = calculatePartApporteurs(
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange,
        userAgency
      );
      
      // Calculer le taux de transformation moyen
      const tauxTransformationMoyen = calculateTauxTransformationMoyen(
        apiData.devis || [],
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      // Calculer le panier moyen HT
      const panierMoyenHT = calculatePanierMoyenHT(
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      // Calculer le délai moyen de facturation
      const delaiMoyenFacturation = calculateDelaiMoyenFacturation(
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      // Calculer le taux de SAV apporteurs
      const tauxSAV = calculateTauxSAV(
        apiData.interventions || [],
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      // Calculer le taux de SAV global (tous les dossiers) - lié au filtre principal
      const tauxSAVGlobal = calculateTauxSAVGlobal(
        apiData.interventions || [],
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        filters.dateRange
      );
      
      // Calculer FLOP 10 apporteurs (plus de dû)
      const flop10Apporteurs = calculateFlop10Apporteurs(
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      // Calculer les statistiques par type d'apporteur (période secondaire)
      const typesApporteursStats = calculateTypesApporteursStats(
        apiData.factures || [],
        apiData.projects || [],
        apiData.devis || [],
        apiData.interventions || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      // Calculer les statistiques des PARTICULIERS (clients directs) - période secondaire
      const particuliersStats = calculateParticuliersStats(
        apiData.factures || [],
        apiData.projects || [],
        apiData.devis || [],
        apiData.interventions || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      // Calculer l'évolution mensuelle Particuliers vs Apporteurs - année dynamique
      const segmentationData = calculateMonthlySegmentation(
        apiData.factures || [],
        apiData.clients || [],
        apiData.projects || [],
        year
      );
      
      if (import.meta.env.DEV) {
        console.log("📊 Stats calculées pour la période:", filters.dateRange, stats);
        console.log("📈 Activité 7 jours:", activityData);
        console.log("📈 Variation vs 30j:", activityVariation);
        console.log("📦 Nombre de projets total:", apiData.projects?.length || 0);
      }
      
      return {
        ...stats,
        activityData,
        activityVariation,
        monthlyCAData,
        top10Apporteurs,
        dossiersConfiesParApporteur,
        duGlobal,
        partApporteurs,
        tauxTransformationMoyen,
        panierMoyenHT,
        delaiMoyenFacturation,
        tauxSAV,
        tauxSAVGlobal,
        flop10Apporteurs,
        typesApporteursStats,
        particuliersStats,
        segmentationData
      };
    },
  });

  const periodLabel = filters.periodLabel || "aujourd'hui";
  
  if (!isAgencyReady) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <p className="text-2xl text-muted-foreground animate-pulse">Chargement de vos données d'agence...</p>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <p className="text-2xl text-muted-foreground animate-pulse">Chargement du dashboard...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    console.error('Erreur de chargement du dashboard:', error);
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <p className="text-2xl text-muted-foreground">Erreur de chargement des données</p>
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <p className="text-2xl text-muted-foreground">Aucune donnée disponible</p>
        </div>
      </AppLayout>
    );
  }
  
  const stats = [
    {
      title: "Dossiers reçus",
      value: data?.dossiersJour || 0,
      subtitle: periodLabel,
      icon: FolderOpen,
      color: "bg-gradient-to-br from-blue-500 to-blue-600",
      trend: data?.variations.dossiers || 0
    },
    {
      title: "RT réalisés",
      value: data?.rtJour || 0,
      subtitle: periodLabel,
      icon: ClipboardCheck,
      color: "bg-gradient-to-br from-green-500 to-green-600",
      trend: data?.variations.rt || 0
    },
    {
      title: "Devis émis",
      value: data?.devisJour || 0,
      subtitle: periodLabel,
      icon: FileText,
      color: "bg-gradient-to-br from-purple-500 to-purple-600",
      trend: data?.variations.devis || 0
    },
    {
      title: "CA période",
      value: formatEuros(data?.caJour || 0),
      subtitle: periodLabel,
      icon: Euro,
      color: "bg-gradient-to-br from-orange-500 to-orange-600",
      trend: data?.variations.ca || 0
    }
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Sélecteur de période au-dessus des tuiles */}
        <div>
          <PeriodSelector />
        </div>

        {/* Section KPIs liés à la période - 16 tuiles compactes */}
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-blue-500/50">
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
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Nombre de projets créés sur la période</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* KPI 2: RT */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-green-500/50">
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
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Nombre de relevés techniques réalisés</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* KPI 3: Devis */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-purple-500/50">
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
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Devis envoyés (state != draft)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* KPI 4: CA */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-orange-500/50">
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
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Somme factures HT (type = facture)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* KPI 5: Taux de SAV */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-red-500/50">
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
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">% interventions SAV / total</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* KPI 6: Délai moyen */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-cyan-500/50">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 p-1.5 rounded-lg">
                        <Clock className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Délai moyen dossier</p>
                    <p className="text-xl font-bold">{data?.delaiMoyenDossier || 0}j</p>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Délai moyen création → facturation (jours)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* KPI 7: Dossiers complexes */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-amber-500/50">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-1.5 rounded-lg">
                        <Layers className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Dossiers complexes</p>
                    <p className="text-xl font-bold">{(data?.tauxDossiersComplexes || 0).toFixed(1)}%</p>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">% dossiers {'>'}6 interventions ou ≥2 travaux</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* KPI 8: Interventions/dossier */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-indigo-500/50">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-1.5 rounded-lg">
                        <BarChart3 className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Interventions/dossier</p>
                    <p className="text-xl font-bold">{(data?.nbMoyenInterventionsParDossier || 0).toFixed(1)}</p>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Moyenne interventions par dossier</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* KPI 9: Taux transformation devis */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-teal-500/50">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-1.5 rounded-lg">
                        <Target className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Taux transformation</p>
                    <p className="text-xl font-bold">{(data?.tauxTransformationDevis || 0).toFixed(1)}%</p>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">% devis envoyés → acceptés (invoice)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* KPI 10: Panier moyen */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-pink-500/50">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-1.5 rounded-lg">
                        <Package className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Panier moyen</p>
                    <p className="text-xl font-bold">{formatEuros(data?.panierMoyen || 0)}</p>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">CA moyen par facture HT</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* KPI 11: Visites/RDV */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-lime-500/50">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="bg-gradient-to-br from-lime-500 to-lime-600 p-1.5 rounded-lg">
                        <Users className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Visites/RDV</p>
                    <p className="text-xl font-bold">{(data?.nbMoyenVisitesParIntervention || 0).toFixed(1)}</p>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Nb moyen visites par intervention</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* KPI 12: Multi-univers */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-violet-500/50">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="bg-gradient-to-br from-violet-500 to-violet-600 p-1.5 rounded-lg">
                        <Layers className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Multi-univers</p>
                    <p className="text-xl font-bold">{(data?.tauxDossiersMultiUnivers || 0).toFixed(1)}%</p>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">% dossiers avec ≥2 univers</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* KPI 13: Dossiers sans devis */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-rose-500/50">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-1.5 rounded-lg">
                        <FileText className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Sans devis</p>
                    <p className="text-xl font-bold">{(data?.tauxDossiersSansDevis || 0).toFixed(1)}%</p>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">% factures sans devis associé</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* KPI 14: Multi-techniciens */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-emerald-500/50">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-1.5 rounded-lg">
                        <UserCheck className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Multi-techniciens</p>
                    <p className="text-xl font-bold">{(data?.tauxDossiersMultiTechniciens || 0).toFixed(1)}%</p>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">% dossiers avec ≥2 techniciens</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* KPI 15: Polyvalence techniciens */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-sky-500/50">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="bg-gradient-to-br from-sky-500 to-sky-600 p-1.5 rounded-lg">
                        <Award className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Polyvalence tech</p>
                    <p className="text-xl font-bold">{(data?.polyvalenceTechniciens || 0).toFixed(1)}</p>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Nb moyen univers par technicien</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* KPI 16: Délai dossier → 1er devis */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="p-3 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-amber-500/50">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-1.5 rounded-lg">
                        <Clock className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Dossier → 1er devis</p>
                    <p className="text-xl font-bold">{(data?.delaiDossierPremierDevis || 0).toFixed(1)} j</p>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Délai moyen ouverture → envoi 1er devis</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Section Graphiques (toutes données) */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Vue d'ensemble</h2>
          <div className="mb-6">
            <ActivityChart 
              data={data?.activityData || []} 
              variation={data?.activityVariation || 0}
            />
          </div>
          
          {/* CA Mensuel 2025 - Non lié au sélecteur */}
          <div className="mb-6">
            {data?.monthlyCAData && <MonthlyCAChart data={data.monthlyCAData} />}
          </div>
        </div>

        {/* Section Les apporteurs (liés au sélecteur secondaire) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Les apporteurs</h2>
            <SecondaryPeriodSelector />
          </div>
          
          {/* Métriques clés en 5 cartes horizontales */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {/* Carte 1: Dû global */}
            <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-orange-500/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-1.5 rounded-lg">
                  <Euro className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">Dû global TTC</p>
              <p className="text-2xl font-bold text-orange-500">{formatEuros(data?.duGlobal || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">à encaisser</p>
            </Card>

            {/* Carte 2: Total dossiers confiés */}
            <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-blue-500/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-1.5 rounded-lg">
                  <FolderOpen className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">Dossiers confiés</p>
              <p className="text-2xl font-bold text-blue-500">
                {data?.dossiersConfiesParApporteur?.reduce((sum, d) => sum + d.nbDossiers, 0) || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">au total</p>
            </Card>

            {/* Carte 3: Taux de transformation moyen */}
            <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-purple-500/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-1.5 rounded-lg flex items-center justify-center w-7 h-7">
                  <span className="text-white font-bold text-sm">%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">Taux de transfo moyen</p>
              <p className="text-2xl font-bold text-purple-500">
                {(data?.tauxTransformationMoyen || 0).toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Devis → Factures</p>
            </Card>

            {/* Carte 4: Panier moyen HT */}
            <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-green-500/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-gradient-to-br from-green-500 to-green-600 p-1.5 rounded-lg">
                  <Euro className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">Panier moyen HT</p>
              <p className="text-2xl font-bold text-green-500">
                {formatEuros(data?.panierMoyenHT || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Dossier apporteur</p>
            </Card>

            {/* Carte 5: Délai moyen dossier → facture */}
            <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-indigo-500/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-1.5 rounded-lg">
                  <ClipboardCheck className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">Délai moyen</p>
              <p className="text-2xl font-bold text-indigo-500">
                {Math.round(data?.delaiMoyenFacturation || 0)} j
              </p>
              <p className="text-xs text-muted-foreground mt-1">Dossier → Facture</p>
            </Card>
          </div>

          {/* Widgets détaillés en 3 colonnes: TOP 10, FLOP 10, Dossiers confiés */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TopApporteursWidget data={data?.top10Apporteurs || []} />
            <FlopApporteursWidget data={data?.flop10Apporteurs || []} />
            <DossiersConfiesWidget dossiers={data?.dossiersConfiesParApporteur || []} />
          </div>

          {/* Section Types d'apporteurs */}
          <div className="mt-8">
            <TypesApporteursWidget data={data?.typesApporteursStats || []} loading={isLoading} />
          </div>

          {/* Section Particuliers (clients directs) */}
          <div className="mt-8">
            <ParticuliersWidget stats={data?.particuliersStats || { caHT: 0, nbDossiers: 0, nbFactures: 0, panierMoyen: 0, tauxTransformation: null, tauxSAV: null }} />
          </div>

          {/* Graphique Segmentation : Particuliers vs Apporteurs */}
          <div className="mt-8">
            <SegmentationChart data={data?.segmentationData || []} loading={isLoading} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
