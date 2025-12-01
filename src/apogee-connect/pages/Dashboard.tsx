import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/apogee-connect/components/layout/AppLayout";
import { DataService } from "@/apogee-connect/services/dataService";
import { LocalErrorBoundary } from "@/components/system/LocalErrorBoundary";
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
import { logApogee } from "@/lib/logger";
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
        logApogee.warn('Agence non définie - Chargement des données annulé');
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
        logApogee.debug('Stats calculées pour la période', { dateRange: filters.dateRange, stats, activityData, activityVariation, nbProjects: apiData.projects?.length || 0 });
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
    logApogee.error('Erreur de chargement du dashboard', { error });
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] space-y-4">
          <p className="text-2xl text-muted-foreground">Erreur de chargement des données</p>
          <p className="text-sm text-muted-foreground">Rechargez la page ou contactez le support si le problème persiste</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Recharger la page
          </button>
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
    <LocalErrorBoundary componentName="Dashboard Apogée">
      <AppLayout>
        <div className="space-y-8">
        {/* Sélecteur de période au-dessus des tuiles */}
        <div>
          <PeriodSelector />
        </div>

        {/* Section KPIs liés à la période - 15 tuiles compactes + 1 placeholder */}
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* KPI 1: Dossiers reçus */}
            <div className="relative group">
              <div className="rounded-xl border border-helpconfort-blue/20 p-3
                bg-gradient-to-br from-white to-helpconfort-blue/5
                shadow-sm transition-all duration-300 cursor-pointer border-l-4 border-l-blue-500
                hover:to-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full border-2 border-blue-400/50 flex items-center justify-center bg-blue-500/10
                    group-hover:border-blue-500 transition-all">
                    <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
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
                <p className="text-xl font-bold text-blue-600">{data?.dossiersJour || 0}</p>
              </div>
              <div className="pointer-events-none absolute z-50 left-1/2 top-full mt-2 -translate-x-1/2 rounded-md border bg-popover px-3 py-1.5 text-[11px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                Nombre de dossiers créés sur la période sélectionnée.
              </div>
            </div>

            {/* KPI 2: RT */}
            <div className="relative group">
              <div className="rounded-xl border border-helpconfort-blue/15 p-3
                bg-gradient-to-b from-helpconfort-blue/5 to-white
                shadow-sm transition-all duration-300 cursor-pointer border-l-4 border-l-green-500
                hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg border-2 border-green-400/50 flex items-center justify-center bg-green-500/10
                    group-hover:border-green-500 transition-all">
                    <ClipboardCheck className="w-3.5 h-3.5 text-green-500" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-0.5">RT réalisés</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold text-green-600">{data?.rtJour || 0}</p>
                  {data?.heuresRT !== undefined && (
                    <span className="text-[10px] text-muted-foreground">({data.heuresRT.toFixed(1)}h)</span>
                  )}
                </div>
              </div>
              <div className="pointer-events-none absolute z-50 left-1/2 top-full mt-2 -translate-x-1/2 rounded-md border bg-popover px-3 py-1.5 text-[11px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                Nombre de relevés techniques réalisés sur la période (et heures associées).
              </div>
            </div>

            {/* KPI 3: Devis */}
            <div className="relative group">
              <div className="rounded-xl border border-helpconfort-blue/15 p-3
                bg-gradient-to-r from-helpconfort-blue/5 to-white
                shadow-sm transition-all duration-300 cursor-pointer border-l-4 border-l-purple-500
                hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full border-2 border-purple-400/50 flex items-center justify-center bg-purple-500/10
                    group-hover:border-purple-500 transition-all">
                    <FileText className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Devis émis</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold text-purple-600">{data?.devisJour || 0}</p>
                  {data?.caDevis !== undefined && (
                    <span className="text-[10px] text-muted-foreground">({formatEuros(data.caDevis)})</span>
                  )}
                </div>
              </div>
              <div className="pointer-events-none absolute z-50 left-1/2 top-full mt-2 -translate-x-1/2 rounded-md border bg-popover px-3 py-1.5 text-[11px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                Devis envoyés (state ≠ draft) sur la période, avec leur montant cumulé.
              </div>
            </div>

            {/* KPI 4: CA */}
            <div className="relative group">
              <div className="rounded-xl border border-helpconfort-blue/15 p-3
                bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white
                shadow-sm transition-all duration-300 cursor-pointer border-l-4 border-l-orange-500
                hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full border-2 border-orange-400/50 flex items-center justify-center bg-orange-500/10
                    group-hover:border-orange-500 transition-all">
                    <Euro className="w-3.5 h-3.5 text-orange-500" />
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
                  <p className="text-xl font-bold text-orange-600">{formatEuros(data?.caJour || 0)}</p>
                  {data?.nbFacturesCA !== undefined && (
                    <span className="text-[10px] text-muted-foreground">({data.nbFacturesCA})</span>
                  )}
                </div>
              </div>
              <div className="pointer-events-none absolute z-50 left-1/2 top-full mt-2 -translate-x-1/2 rounded-md border bg-popover px-3 py-1.5 text-[11px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                Somme du montant HT des factures (type = facture) sur la période, avec le nombre de factures.
              </div>
            </div>

            {/* KPI 5: Taux de SAV */}
            <div className="relative group">
              <div className="rounded-xl border border-red-200 p-3
                bg-gradient-to-br from-white to-red-50
                shadow-sm transition-all duration-300 cursor-pointer border-l-4 border-l-red-500
                hover:to-red-100 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full border-2 border-red-400/50 flex items-center justify-center bg-red-500/10
                    group-hover:border-red-500 transition-all">
                    <span className="text-red-500 font-bold text-[9px]">SAV</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Taux de SAV</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold text-red-600">{(data?.tauxSAVGlobal || 0).toFixed(1)}%</p>
                </div>
              </div>
              <div className="pointer-events-none absolute z-50 left-1/2 top-full mt-2 -translate-x-1/2 rounded-md border bg-popover px-3 py-1.5 text-[11px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                Pourcentage d&apos;interventions de type SAV sur l&apos;ensemble des interventions.
              </div>
            </div>

            {/* KPI 6: Délai moyen */}
            <div className="relative group">
              <div className="rounded-xl border border-helpconfort-blue/20 p-3
                bg-gradient-to-br from-white to-helpconfort-blue/5
                shadow-sm transition-all duration-300 cursor-pointer border-l-4 border-l-cyan-500
                hover:to-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full border-2 border-cyan-400/50 flex items-center justify-center bg-cyan-500/10
                    group-hover:border-cyan-500 transition-all">
                    <Clock className="w-3.5 h-3.5 text-cyan-500" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Délai moyen dossier</p>
                <p className="text-xl font-bold text-cyan-600">{data?.delaiMoyenDossier || 0}j</p>
              </div>
              <div className="pointer-events-none absolute z-50 left-1/2 top-full mt-2 -translate-x-1/2 rounded-md border bg-popover px-3 py-1.5 text-[11px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                Délai moyen en jours entre la création du dossier et sa facturation.
              </div>
            </div>

            {/* KPI 7: Dossiers complexes */}
            <div className="relative group">
              <div className="rounded-xl border border-helpconfort-blue/15 p-3
                bg-gradient-to-b from-helpconfort-blue/5 to-white
                shadow-sm transition-all duration-300 cursor-pointer border-l-4 border-l-amber-500
                hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg border-2 border-amber-400/50 flex items-center justify-center bg-amber-500/10
                    group-hover:border-amber-500 transition-all">
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Dossiers complexes</p>
                <p className="text-xl font-bold text-amber-600">{(data?.tauxDossiersComplexes || 0).toFixed(1)}%</p>
              </div>
              <div className="pointer-events-none absolute z-50 left-1/2 top-full mt-2 -translate-x-1/2 rounded-md border bg-popover px-3 py-1.5 text-[11px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                Pourcentage de dossiers avec &gt; 6 interventions ou au moins 2 interventions travaux.
              </div>
            </div>

            {/* KPI 8: Interventions/dossier */}
            <div className="relative group">
              <div className="rounded-xl border border-helpconfort-blue/15 p-3
                bg-gradient-to-r from-helpconfort-blue/5 to-white
                shadow-sm transition-all duration-300 cursor-pointer border-l-4 border-l-indigo-500
                hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full border-2 border-indigo-400/50 flex items-center justify-center bg-indigo-500/10
                    group-hover:border-indigo-500 transition-all">
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Interventions/dossier</p>
                <p className="text-xl font-bold text-indigo-600">{(data?.nbMoyenInterventionsParDossier || 0).toFixed(1)}</p>
              </div>
              <div className="pointer-events-none absolute z-50 left-1/2 top-full mt-2 -translate-x-1/2 rounded-md border bg-popover px-3 py-1.5 text-[11px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                Nombre moyen d&apos;interventions réalisées par dossier.
              </div>
            </div>

            {/* KPI 9: Taux transformation devis */}
            <div className="relative group">
              <div className="rounded-xl border border-helpconfort-blue/15 p-3
                bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white
                shadow-sm transition-all duration-300 cursor-pointer border-l-4 border-l-teal-500
                hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full border-2 border-teal-400/50 flex items-center justify-center bg-teal-500/10
                    group-hover:border-teal-500 transition-all">
                    <Target className="w-3.5 h-3.5 text-teal-500" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Taux transformation</p>
                <p className="text-xl font-bold text-teal-600">{(data?.tauxTransformationDevis || 0).toFixed(1)}%</p>
              </div>
              <div className="pointer-events-none absolute z-50 left-1/2 top-full mt-2 -translate-x-1/2 rounded-md border bg-popover px-3 py-1.5 text-[11px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                Pourcentage de devis envoyés qui sont passés au statut accepté / facturé.
              </div>
            </div>

            {/* KPI 10: Panier moyen */}
            <div className="relative group">
              <div className="rounded-xl border border-helpconfort-blue/20 p-3
                bg-gradient-to-br from-white to-helpconfort-blue/5
                shadow-sm transition-all duration-300 cursor-pointer border-l-4 border-l-pink-500
                hover:to-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full border-2 border-pink-400/50 flex items-center justify-center bg-pink-500/10
                    group-hover:border-pink-500 transition-all">
                    <Package className="w-3.5 h-3.5 text-pink-500" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Panier moyen</p>
                <p className="text-xl font-bold text-pink-600">{formatEuros(data?.panierMoyen || 0)}</p>
              </div>
              <div className="pointer-events-none absolute z-50 left-1/2 top-full mt-2 -translate-x-1/2 rounded-md border bg-popover px-3 py-1.5 text-[11px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                Montant moyen HT par facture sur la période.
              </div>
            </div>

            {/* KPI 11: Visites/RDV */}
            <div className="relative group">
              <div className="rounded-xl border border-helpconfort-blue/15 p-3
                bg-gradient-to-b from-helpconfort-blue/5 to-white
                shadow-sm transition-all duration-300 cursor-pointer border-l-4 border-l-lime-500
                hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg border-2 border-lime-400/50 flex items-center justify-center bg-lime-500/10
                    group-hover:border-lime-500 transition-all">
                    <Users className="w-3.5 h-3.5 text-lime-500" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Visites/RDV</p>
                <p className="text-xl font-bold text-lime-600">{(data?.nbMoyenVisitesParIntervention || 0).toFixed(1)}</p>
              </div>
              <div className="pointer-events-none absolute z-50 left-1/2 top-full mt-2 -translate-x-1/2 rounded-md border bg-popover px-3 py-1.5 text-[11px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                Nombre moyen de visites par intervention (toutes sources confondues).
              </div>
            </div>

            {/* KPI 12: Multi-univers */}
            <div className="relative group">
              <div className="rounded-xl border border-helpconfort-blue/15 p-3
                bg-gradient-to-r from-helpconfort-blue/5 to-white
                shadow-sm transition-all duration-300 cursor-pointer border-l-4 border-l-violet-500
                hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full border-2 border-violet-400/50 flex items-center justify-center bg-violet-500/10
                    group-hover:border-violet-500 transition-all">
                    <Layers className="w-3.5 h-3.5 text-violet-500" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Multi-univers</p>
                <p className="text-xl font-bold text-violet-600">{(data?.tauxDossiersMultiUnivers || 0).toFixed(1)}%</p>
              </div>
              <div className="pointer-events-none absolute z-50 left-1/2 top-full mt-2 -translate-x-1/2 rounded-md border bg-popover px-3 py-1.5 text-[11px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                Pourcentage de dossiers faisant intervenir au moins deux univers (plomberie, électricité, etc.).
              </div>
            </div>

            {/* KPI 13: Dossiers sans devis */}
            <div className="relative group">
              <div className="rounded-xl border border-helpconfort-blue/15 p-3
                bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white
                shadow-sm transition-all duration-300 cursor-pointer border-l-4 border-l-rose-500
                hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full border-2 border-rose-400/50 flex items-center justify-center bg-rose-500/10
                    group-hover:border-rose-500 transition-all">
                    <FileText className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Sans devis</p>
                <p className="text-xl font-bold text-rose-600">{(data?.tauxDossiersSansDevis || 0).toFixed(1)}%</p>
              </div>
              <div className="pointer-events-none absolute z-50 left-1/2 top-full mt-2 -translate-x-1/2 rounded-md border bg-popover px-3 py-1.5 text-[11px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                Pourcentage de factures émises sans devis associé dans Apogée.
              </div>
            </div>

            {/* KPI 14: Multi-techniciens */}
            <div className="relative group">
              <div className="rounded-xl border border-helpconfort-blue/15 p-3
                bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white
                shadow-sm transition-all duration-300 cursor-pointer border-l-4 border-l-emerald-500
                hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full border-2 border-emerald-400/50 flex items-center justify-center bg-emerald-500/10
                    group-hover:border-emerald-500 transition-all">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Multi-techniciens</p>
                <p className="text-xl font-bold text-emerald-600">{(data?.tauxDossiersMultiTechniciens || 0).toFixed(1)}%</p>
              </div>
              <div className="pointer-events-none absolute z-50 left-1/2 top-full mt-2 -translate-x-1/2 rounded-md border bg-popover px-3 py-1.5 text-[11px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                Pourcentage de dossiers sur lesquels au moins deux techniciens différents sont intervenus.
              </div>
            </div>

            {/* KPI 15: Polyvalence techniciens */}
            <div className="relative group">
              <div className="rounded-xl border border-helpconfort-blue/15 p-3
                bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white
                shadow-sm transition-all duration-300 cursor-pointer border-l-4 border-l-sky-500
                hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full border-2 border-sky-400/50 flex items-center justify-center bg-sky-500/10
                    group-hover:border-sky-500 transition-all">
                    <Award className="w-3.5 h-3.5 text-sky-500" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Polyvalence tech</p>
                <p className="text-xl font-bold text-sky-600">{(data?.polyvalenceTechniciens || 0).toFixed(1)}</p>
              </div>
              <div className="pointer-events-none absolute z-50 left-1/2 top-full mt-2 -translate-x-1/2 rounded-md border bg-popover px-3 py-1.5 text-[11px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                Nombre moyen d&apos;univers différents couverts par technicien.
              </div>
            </div>

            {/* KPI 16: Placeholder - À définir */}
            <div className="relative group">
              <div className="rounded-xl border border-helpconfort-blue/15 p-3
                bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/5 via-white to-white
                shadow-sm transition-all duration-300 cursor-pointer border-l-4 border-l-muted-foreground/30 border-dashed
                hover:from-helpconfort-blue/10 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center bg-muted/20
                    group-hover:border-muted-foreground/50 transition-all">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-0.5">KPI à définir</p>
                <p className="text-xl font-bold text-muted-foreground">-</p>
              </div>
              <div className="pointer-events-none absolute z-50 left-1/2 top-full mt-2 -translate-x-1/2 rounded-md border bg-popover px-3 py-1.5 text-[11px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                Indicateur réservé pour un futur KPI (non encore calculé).
              </div>
            </div>
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
    </LocalErrorBoundary>
  );
}
