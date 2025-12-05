import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataService } from "@/apogee-connect/services/dataService";
import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { useApiToggle } from "@/apogee-connect/contexts/ApiToggleContext";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { logWarn, logError } from "@/lib/logger";
import { FolderOpen, Euro, Percent, ShoppingCart, Clock, Users, TrendingUp, Heart, ArrowUpRight } from "lucide-react";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { SecondaryPeriodSelector } from "@/apogee-connect/components/filters/SecondaryPeriodSelector";
import { 
  calculateTop10Apporteurs, 
  calculateDossiersConfiesParApporteur, 
  calculateFlop10Apporteurs,
} from "@/apogee-connect/utils/apporteursCalculations";
import { calculateTypesApporteursStats } from "@/apogee-connect/utils/typesApporteursCalculations";
import { calculateParticuliersStats } from "@/apogee-connect/utils/particuliersCalculations";
import { calculateMonthlySegmentation } from "@/apogee-connect/utils/segmentationCalculations";
import {
  calculateDelaiMoyenPaiement,
  calculateTauxFidelite,
  calculateCroissanceCA
} from "@/apogee-connect/utils/apporteursExtendedCalculations";
import { TopApporteursWidget } from "@/apogee-connect/components/widgets/TopApporteursWidget";
import { DossiersConfiesWidget } from "@/apogee-connect/components/widgets/DossiersConfiesWidget";
import { FlopApporteursWidget } from "@/apogee-connect/components/widgets/FlopApporteursWidget";
import { TypesApporteursWidget } from "@/apogee-connect/components/widgets/TypesApporteursWidget";
import { ParticuliersWidget } from "@/apogee-connect/components/widgets/ParticuliersWidget";
import { SegmentationChart } from "@/apogee-connect/components/widgets/SegmentationChart";
import { ApporteurTypeTimeline } from "@/apogee-connect/components/widgets/ApporteurTypeTimeline";
// StatIA imports
import { useApporteursStatia } from "@/statia/hooks/useApporteursStatia";

export default function IndicateursApporteurs() {
  const { filters: secondaryFilters } = useSecondaryFilters();
  const { isApiEnabled } = useApiToggle();
  const { agencyChangeCounter, currentAgency, isAgencyReady } = useAgency();

  // ========== STATIA KPIs ==========
  // Utilise les métriques StatIA pour les KPIs principaux
  const { 
    data: statiaKpis, 
    isLoading: isStatiaLoading 
  } = useApporteursStatia();

  // ========== DONNÉES WIDGETS (legacy - à migrer progressivement) ==========
  const { data: widgetsData, isLoading: isWidgetsLoading, error } = useQuery({
    queryKey: ["apporteurs-widgets", secondaryFilters, isApiEnabled, agencyChangeCounter],
    enabled: isAgencyReady && isApiEnabled,
    queryFn: async () => {
      if (!currentAgency?.id) {
        logWarn('INDICATEURS_APPORTEURS', 'Agence non définie - Chargement des données annulé');
        return null;
      }
      
      const apiData = await DataService.loadAllData(isApiEnabled);
      
      const top10Apporteurs = calculateTop10Apporteurs(
        apiData.factures || [],
        apiData.projects || [],
        apiData.devis || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      const dossiersConfiesParApporteur = calculateDossiersConfiesParApporteur(
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      const flop10Apporteurs = calculateFlop10Apporteurs(
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      const typesApporteursStats = calculateTypesApporteursStats(
        apiData.factures || [],
        apiData.projects || [],
        apiData.devis || [],
        apiData.interventions || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      const particuliersStats = calculateParticuliersStats(
        apiData.factures || [],
        apiData.projects || [],
        apiData.devis || [],
        apiData.interventions || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      const currentYear = new Date().getFullYear();
      const segmentationData = calculateMonthlySegmentation(
        apiData.factures || [],
        apiData.clients || [],
        apiData.projects || [],
        currentYear
      );
      
      return {
        top10Apporteurs,
        dossiersConfiesParApporteur,
        flop10Apporteurs,
        typesApporteursStats,
        particuliersStats,
        segmentationData,
        rawProjects: apiData.projects || [],
        rawClients: apiData.clients || [],
        apiGetFactures: apiData.factures || [],
        apiGetProjects: apiData.projects || []
      };
    },
  });

  // KPIs étendus (legacy - conservés pour compatibilité)
  const delaiPaiement = useMemo(() => {
    if (!widgetsData?.apiGetFactures || !widgetsData?.apiGetProjects) return { delaiMoyen: 0, nbFactures: 0 };
    return calculateDelaiMoyenPaiement(widgetsData.apiGetFactures, widgetsData.apiGetProjects, secondaryFilters.dateRange);
  }, [widgetsData, secondaryFilters.dateRange]);

  const tauxFidelite = useMemo(() => {
    if (!widgetsData?.apiGetFactures || !widgetsData?.apiGetProjects) return { tauxFidelite: 0, nbRecurrents: 0, nbTotal: 0, hasDataN1: false };
    return calculateTauxFidelite(widgetsData.apiGetFactures, widgetsData.apiGetProjects, secondaryFilters.dateRange);
  }, [widgetsData, secondaryFilters.dateRange]);

  const croissanceCA = useMemo(() => {
    if (!widgetsData?.apiGetFactures || !widgetsData?.apiGetProjects) return { croissance: 0, caPeriodeN: 0, caPeriodeN1: 0, hasDataN1: false };
    return calculateCroissanceCA(widgetsData.apiGetFactures, widgetsData.apiGetProjects, secondaryFilters.dateRange);
  }, [widgetsData, secondaryFilters.dateRange]);

  const isLoading = isStatiaLoading || isWidgetsLoading;

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
        <p className="text-2xl text-muted-foreground animate-pulse">Chargement des données apporteurs...</p>
      </div>
    );
  }

  if (error) {
    logError('INDICATEURS_APPORTEURS', 'Erreur de chargement des données', { error });
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <p className="text-2xl text-muted-foreground">Erreur de chargement des données</p>
      </div>
    );
  }

  if (!widgetsData) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <p className="text-2xl text-muted-foreground">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Les apporteurs
        </h1>
        <SecondaryPeriodSelector />
      </div>

      {/* Métriques clés en 5 cartes horizontales - UTILISE STATIA */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Carte 1: Dû global */}
        <div className="group rounded-xl border border-helpconfort-blue/20 p-4
          bg-gradient-to-br from-white to-helpconfort-blue/5
          shadow-sm transition-all duration-300 border-l-4 border-l-orange-500
          hover:to-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full border-2 border-orange-400/50 flex items-center justify-center bg-orange-500/10
              group-hover:border-orange-500 transition-all">
              <Euro className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Dû global TTC</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-orange-500">{formatEuros(statiaKpis?.duGlobal || 0)}</p>
            <p className="text-xs text-muted-foreground">à encaisser</p>
          </div>
        </div>

        {/* Carte 2: Total dossiers confiés */}
        <div className="group rounded-xl border border-helpconfort-blue/15 p-4
          bg-gradient-to-b from-helpconfort-blue/5 to-white
          shadow-sm transition-all duration-300 border-l-4 border-l-blue-500
          hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg border-2 border-blue-400/50 flex items-center justify-center bg-blue-500/10
              group-hover:border-blue-500 transition-all">
              <FolderOpen className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Dossiers confiés</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-blue-500">
              {statiaKpis?.dossiersConfiesTotal || 0}
            </p>
            <p className="text-xs text-muted-foreground">total période</p>
          </div>
        </div>

        {/* Carte 3: Taux de transformation moyen */}
        <div className="group rounded-xl border border-helpconfort-blue/15 p-4
          bg-gradient-to-r from-helpconfort-blue/5 to-white
          shadow-sm transition-all duration-300 border-l-4 border-l-purple-500
          hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full border-2 border-purple-400/50 flex items-center justify-center bg-purple-500/10
              group-hover:border-purple-500 transition-all">
              <Percent className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Taux de transfo moyen</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-purple-500">{(statiaKpis?.tauxTransformationMoyen || 0).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Devis → Factures</p>
          </div>
        </div>

        {/* Carte 4: Panier moyen HT */}
        <div className="group rounded-xl border border-helpconfort-blue/15 p-4
          bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white
          shadow-sm transition-all duration-300 border-l-4 border-l-green-500
          hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full border-2 border-green-400/50 flex items-center justify-center bg-green-500/10
              group-hover:border-green-500 transition-all">
              <ShoppingCart className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Panier moyen HT</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-green-500">{formatEuros(statiaKpis?.panierMoyenHT || 0)}</p>
            <p className="text-xs text-muted-foreground">Dossier apporteur</p>
          </div>
        </div>

        {/* Carte 5: Délai moyen */}
        <div className="group rounded-xl border border-helpconfort-blue/20 p-4
          bg-gradient-to-br from-white to-helpconfort-blue/5
          shadow-sm transition-all duration-300 border-l-4 border-l-indigo-500
          hover:to-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full border-2 border-indigo-400/50 flex items-center justify-center bg-indigo-500/10
              group-hover:border-indigo-500 transition-all">
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Délai moyen</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-indigo-500">{Math.round(statiaKpis?.delaiMoyenFacturation || 0)} j</p>
            <p className="text-xs text-muted-foreground">Dossier → Facture</p>
          </div>
        </div>
      </div>

      {/* 5 nouveaux KPI avec données STATIA */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 6: Nombre d'apporteurs actifs */}
        <div className="group rounded-xl border border-helpconfort-blue/15 p-4
          bg-gradient-to-b from-helpconfort-blue/5 to-white
          shadow-sm transition-all duration-300 border-l-4 border-l-cyan-500
          hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg border-2 border-cyan-400/50 flex items-center justify-center bg-cyan-500/10
              group-hover:border-cyan-500 transition-all">
              <Users className="w-4 h-4 text-cyan-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Apporteurs actifs</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-cyan-500">{statiaKpis?.apporteursActifs || 0}</p>
            <p className="text-xs text-muted-foreground">sur la période</p>
          </div>
        </div>

        {/* KPI 7: CA moyen par apporteur */}
        <div className="group rounded-xl border border-helpconfort-blue/15 p-4
          bg-gradient-to-r from-helpconfort-blue/5 to-white
          shadow-sm transition-all duration-300 border-l-4 border-l-pink-500
          hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full border-2 border-pink-400/50 flex items-center justify-center bg-pink-500/10
              group-hover:border-pink-500 transition-all">
              <TrendingUp className="w-4 h-4 text-pink-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">CA moyen / Apporteur</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-pink-500">{formatEuros(statiaKpis?.caMoyenParApporteur || 0)}</p>
            <p className="text-xs text-muted-foreground">moyenne HT</p>
          </div>
        </div>

        {/* KPI 8: Délai moyen de paiement */}
        <div className="group rounded-xl border border-helpconfort-blue/20 p-4
          bg-gradient-to-br from-white to-helpconfort-blue/5
          shadow-sm transition-all duration-300 border-l-4 border-l-amber-500
          hover:to-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full border-2 border-amber-400/50 flex items-center justify-center bg-amber-500/10
              group-hover:border-amber-500 transition-all">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Délai paiement</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-amber-500">{delaiPaiement.delaiMoyen} j</p>
            <p className="text-xs text-muted-foreground">moyen</p>
          </div>
        </div>

        {/* KPI 9: Taux de fidélité */}
        <div className="group rounded-xl border border-helpconfort-blue/15 p-4
          bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white
          shadow-sm transition-all duration-300 border-l-4 border-l-emerald-500
          hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full border-2 border-emerald-400/50 flex items-center justify-center bg-emerald-500/10
              group-hover:border-emerald-500 transition-all">
              <Heart className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Taux de fidélité</p>
          </div>
          <div className="flex items-baseline gap-2">
            {tauxFidelite.hasDataN1 ? (
              <>
                <p className="text-2xl font-bold text-emerald-500">{tauxFidelite.tauxFidelite}%</p>
                <p className="text-xs text-muted-foreground">apporteurs récurrents</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">Données N-1 indisponibles</p>
            )}
          </div>
        </div>

        {/* KPI 10: Croissance CA */}
        <div className="group rounded-xl border border-helpconfort-blue/15 p-4
          bg-gradient-to-b from-helpconfort-blue/5 to-white
          shadow-sm transition-all duration-300 border-l-4 border-l-violet-500
          hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg border-2 border-violet-400/50 flex items-center justify-center bg-violet-500/10
              group-hover:border-violet-500 transition-all">
              <ArrowUpRight className="w-4 h-4 text-violet-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Croissance CA</p>
          </div>
          <div className="flex items-baseline gap-2">
            {croissanceCA.hasDataN1 ? (
              <>
                <p className={`text-2xl font-bold ${croissanceCA.croissance >= 0 ? 'text-violet-500' : 'text-red-500'}`}>
                  {croissanceCA.croissance >= 0 ? '+' : ''}{croissanceCA.croissance}%
                </p>
                <p className="text-xs text-muted-foreground">vs période N-1</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">Données N-1 indisponibles</p>
            )}
          </div>
        </div>
      </div>

      {/* Widgets TOP/FLOP + Dossiers confiés */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopApporteursWidget data={widgetsData?.top10Apporteurs || []} />
        <FlopApporteursWidget data={widgetsData?.flop10Apporteurs || []} />
        <DossiersConfiesWidget dossiers={widgetsData?.dossiersConfiesParApporteur || []} />
      </div>

      {/* Widget Types d'apporteurs + Graphique Segmentation (2 colonnes) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TypesApporteursWidget data={widgetsData?.typesApporteursStats || []} mode="chartOnly" />
        <SegmentationChart data={widgetsData?.segmentationData || []} />
      </div>

      {/* 7 briques alignées : 6 types d'apporteurs + clients directs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 items-stretch">
        {/* 6 tuiles par type d'apporteur (avec couleurs + icônes) */}
        <TypesApporteursWidget data={widgetsData?.typesApporteursStats || []} mode="cardsOnly" />

        {/* 1 tuile Clients Directs (Particuliers) */}
        <ParticuliersWidget stats={widgetsData?.particuliersStats} />
      </div>

      {/* Timeline Apporteurs */}
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold">Évolution temporelle</h3>
          <p className="text-sm text-muted-foreground">
            Nombre de dossiers créés par type d'apporteur, mois par mois
          </p>
        </div>
        <ApporteurTypeTimeline 
          projects={widgetsData?.rawProjects || []} 
          clients={widgetsData?.rawClients || []} 
        />
      </div>
    </div>
  );
}
