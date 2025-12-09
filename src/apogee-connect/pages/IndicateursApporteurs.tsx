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
  calculateDossiersConfiesParApporteur, 
  ApporteurStats,
  FlopApporteurStats,
} from "@/apogee-connect/utils/apporteursCalculations";
import { TopApporteursWidget } from "@/apogee-connect/components/widgets/TopApporteursWidget";
import { DossiersConfiesWidget } from "@/apogee-connect/components/widgets/DossiersConfiesWidget";
import { FlopApporteursWidget } from "@/apogee-connect/components/widgets/FlopApporteursWidget";
import { TypesApporteursWidget } from "@/apogee-connect/components/widgets/TypesApporteursWidget";
import { ParticuliersWidget } from "@/apogee-connect/components/widgets/ParticuliersWidget";
import { SegmentationChart } from "@/apogee-connect/components/widgets/SegmentationChart";
import { ApporteurTypeTimeline } from "@/apogee-connect/components/widgets/ApporteurTypeTimeline";
import { useApporteursStatia } from "@/statia/hooks/useApporteursStatia";
import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES } from "@/config/routes";

export default function IndicateursApporteurs() {
  const { filters: secondaryFilters } = useSecondaryFilters();
  const { isApiEnabled } = useApiToggle();
  const { agencyChangeCounter, currentAgency, isAgencyReady } = useAgency();

  // ========== STATIA KPIs ==========
  const { 
    data: statiaKpis, 
    isLoading: isStatiaLoading 
  } = useApporteursStatia();

  // ========== DONNÉES LEGACY (timeline uniquement) ==========
  const { data: widgetsData, isLoading: isWidgetsLoading, error } = useQuery({
    queryKey: ["apporteurs-widgets", secondaryFilters, isApiEnabled, agencyChangeCounter],
    enabled: isAgencyReady && isApiEnabled,
    queryFn: async () => {
      if (!currentAgency?.id) {
        logWarn('INDICATEURS_APPORTEURS', 'Agence non définie');
        return null;
      }
      
      const apiData = await DataService.loadAllData(isApiEnabled);
      
      const dossiersConfiesParApporteur = calculateDossiersConfiesParApporteur(
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      return {
        dossiersConfiesParApporteur,
        rawProjects: apiData.projects || [],
        rawClients: apiData.clients || [],
      };
    },
  });

  // ========== TRANSFORMATION STATIA → WIDGETS ==========
  const topApporteursForWidget = useMemo((): ApporteurStats[] => {
    if (!statiaKpis?.topApporteurs?.length) return [];
    return statiaKpis.topApporteurs.map((item, idx) => ({
      apporteurId: idx + 1,
      name: item.name,
      caHT: item.ca,
      nbDossiers: statiaKpis.dossiersParApporteur[item.name] || 0,
      nbDevis: 0,
      tauxTransformation: statiaKpis.tauxTransfoParApporteur[item.name] || 0,
    }));
  }, [statiaKpis]);

  const flopApporteursForWidget = useMemo((): FlopApporteurStats[] => {
    if (!statiaKpis?.topEncours?.length) return [];
    return statiaKpis.topEncours.map((item, idx) => ({
      apporteurId: idx + 1,
      name: item.name,
      duTotal: item.encours,
      nbFacturesImpayees: 1,
    }));
  }, [statiaKpis]);

  // Transformation StatIA → TypesApporteursWidget
  const typesApporteursStats = useMemo(() => {
    if (!statiaKpis?.statsByType?.length) return [];
    return statiaKpis.statsByType.map(s => ({
      type: s.type,
      caHT: s.caHT,
      nbDossiers: s.nbDossiers,
      nbFactures: s.nbDossiers, // Approximation
      panierMoyen: s.panierMoyen,
      tauxTransformation: s.tauxTransfo,
      tauxSAV: s.tauxSav,
    }));
  }, [statiaKpis]);

  // Transformation StatIA → SegmentationChart
  const segmentationData = useMemo(() => {
    if (!statiaKpis?.segmentationMensuelle?.length) return [];
    return statiaKpis.segmentationMensuelle.map(m => ({
      month: m.mois,
      mois: m.mois,
      caParticuliers: m.particuliers,
      caApporteurs: m.apporteurs,
      totalCA: m.particuliers + m.apporteurs,
      percentParticuliers: (m.particuliers + m.apporteurs) > 0 ? (m.particuliers / (m.particuliers + m.apporteurs)) * 100 : 0,
      percentApporteurs: (m.particuliers + m.apporteurs) > 0 ? (m.apporteurs / (m.particuliers + m.apporteurs)) * 100 : 0,
      partParticuliers: (m.particuliers + m.apporteurs) > 0 ? (m.particuliers / (m.particuliers + m.apporteurs)) * 100 : 0,
      partApporteurs: (m.particuliers + m.apporteurs) > 0 ? (m.apporteurs / (m.particuliers + m.apporteurs)) * 100 : 0,
      apporteurs: m.apporteurs,
      particuliers: m.particuliers,
    }));
  }, [statiaKpis]);

  // Stats Particuliers (Clients Directs) depuis StatIA
  const particuliersStats = useMemo(() => {
    const cdStats = statiaKpis?.statsByType?.find(s => s.type === 'Clients Directs');
    return {
      caHT: cdStats?.caHT || 0,
      nbDossiers: cdStats?.nbDossiers || 0,
      nbFactures: cdStats?.nbDossiers || 0,
      panierMoyen: cdStats?.panierMoyen || 0,
      tauxTransformation: cdStats?.tauxTransfo || 0,
      tauxSAV: cdStats?.tauxSav || 0,
    };
  }, [statiaKpis]);

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

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <PageHeader
        title="Les apporteurs"
        backTo={ROUTES.pilotage.index}
        backLabel="Mon Agence"
        rightElement={<SecondaryPeriodSelector />}
      />

      {/* 5 KPIs principaux - STATIA */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Carte 1: Dû global */}
        <div className="group rounded-xl border border-helpconfort-blue/20 p-4
          bg-gradient-to-br from-background to-helpconfort-blue/5
          shadow-sm transition-all duration-300 border-l-4 border-l-orange-500
          hover:to-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full border-2 border-orange-400/50 flex items-center justify-center bg-orange-500/10">
              <Euro className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Dû global TTC</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-orange-500">{formatEuros(statiaKpis?.duGlobal || 0)}</p>
            <p className="text-xs text-muted-foreground">à encaisser</p>
          </div>
        </div>

        {/* Carte 2: Dossiers confiés */}
        <div className="group rounded-xl border border-helpconfort-blue/15 p-4
          bg-gradient-to-b from-helpconfort-blue/5 to-background
          shadow-sm transition-all duration-300 border-l-4 border-l-blue-500
          hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg border-2 border-blue-400/50 flex items-center justify-center bg-blue-500/10">
              <FolderOpen className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Dossiers confiés</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-blue-500">{statiaKpis?.dossiersConfiesTotal || 0}</p>
            <p className="text-xs text-muted-foreground">total période</p>
          </div>
        </div>

        {/* Carte 3: Taux transfo */}
        <div className="group rounded-xl border border-helpconfort-blue/15 p-4
          bg-gradient-to-r from-helpconfort-blue/5 to-background
          shadow-sm transition-all duration-300 border-l-4 border-l-purple-500
          hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full border-2 border-purple-400/50 flex items-center justify-center bg-purple-500/10">
              <Percent className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Taux transfo moyen</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-purple-500">{(statiaKpis?.tauxTransformationMoyen || 0).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Devis → Factures</p>
          </div>
        </div>

        {/* Carte 4: Panier moyen */}
        <div className="group rounded-xl border border-helpconfort-blue/15 p-4
          bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-background to-background
          shadow-sm transition-all duration-300 border-l-4 border-l-green-500
          hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full border-2 border-green-400/50 flex items-center justify-center bg-green-500/10">
              <ShoppingCart className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Panier moyen HT</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-green-500">{formatEuros(statiaKpis?.panierMoyenHT || 0)}</p>
            <p className="text-xs text-muted-foreground">par dossier</p>
          </div>
        </div>

        {/* Carte 5: Délai moyen */}
        <div className="group rounded-xl border border-helpconfort-blue/20 p-4
          bg-gradient-to-br from-background to-helpconfort-blue/5
          shadow-sm transition-all duration-300 border-l-4 border-l-indigo-500
          hover:to-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full border-2 border-indigo-400/50 flex items-center justify-center bg-indigo-500/10">
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

      {/* 5 KPIs secondaires - STATIA */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        {/* Apporteurs actifs */}
        <div className="group rounded-xl border border-helpconfort-blue/15 p-4
          bg-gradient-to-b from-helpconfort-blue/5 to-background
          shadow-sm transition-all duration-300 border-l-4 border-l-cyan-500
          hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg border-2 border-cyan-400/50 flex items-center justify-center bg-cyan-500/10">
              <Users className="w-4 h-4 text-cyan-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Apporteurs actifs</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-cyan-500">{statiaKpis?.apporteursActifs || 0}</p>
            <p className="text-xs text-muted-foreground">sur période</p>
          </div>
        </div>

        {/* CA moyen / Apporteur */}
        <div className="group rounded-xl border border-helpconfort-blue/15 p-4
          bg-gradient-to-r from-helpconfort-blue/5 to-background
          shadow-sm transition-all duration-300 border-l-4 border-l-pink-500
          hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full border-2 border-pink-400/50 flex items-center justify-center bg-pink-500/10">
              <TrendingUp className="w-4 h-4 text-pink-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">CA moyen / Apporteur</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-pink-500">{formatEuros(statiaKpis?.caMoyenParApporteur || 0)}</p>
            <p className="text-xs text-muted-foreground">moyenne HT</p>
          </div>
        </div>

        {/* Délai paiement */}
        <div className="group rounded-xl border border-helpconfort-blue/20 p-4
          bg-gradient-to-br from-background to-helpconfort-blue/5
          shadow-sm transition-all duration-300 border-l-4 border-l-amber-500
          hover:to-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full border-2 border-amber-400/50 flex items-center justify-center bg-amber-500/10">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Délai paiement</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-amber-500">{statiaKpis?.delaiMoyenPaiement || 0} j</p>
            <p className="text-xs text-muted-foreground">moyen</p>
          </div>
        </div>

        {/* Taux fidélité */}
        <div className="group rounded-xl border border-helpconfort-blue/15 p-4
          bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-background to-background
          shadow-sm transition-all duration-300 border-l-4 border-l-emerald-500
          hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full border-2 border-emerald-400/50 flex items-center justify-center bg-emerald-500/10">
              <Heart className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Taux fidélité</p>
          </div>
          <div className="flex items-baseline gap-2">
            {statiaKpis?.hasDataN1 ? (
              <>
                <p className="text-2xl font-bold text-emerald-500">{statiaKpis?.tauxFidelite || 0}%</p>
                <p className="text-xs text-muted-foreground">récurrents</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">N-1 indisponibles</p>
            )}
          </div>
        </div>

        {/* Croissance CA */}
        <div className="group rounded-xl border border-helpconfort-blue/15 p-4
          bg-gradient-to-b from-helpconfort-blue/5 to-background
          shadow-sm transition-all duration-300 border-l-4 border-l-violet-500
          hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg border-2 border-violet-400/50 flex items-center justify-center bg-violet-500/10">
              <ArrowUpRight className="w-4 h-4 text-violet-500" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Croissance CA</p>
          </div>
          <div className="flex items-baseline gap-2">
            {statiaKpis?.hasDataN1 ? (
              <>
                <p className={`text-2xl font-bold ${(statiaKpis?.croissanceCA || 0) >= 0 ? 'text-violet-500' : 'text-red-500'}`}>
                  {(statiaKpis?.croissanceCA || 0) >= 0 ? '+' : ''}{statiaKpis?.croissanceCA || 0}%
                </p>
                <p className="text-xs text-muted-foreground">vs N-1</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">N-1 indisponibles</p>
            )}
          </div>
        </div>
      </div>

      {/* Widgets TOP/FLOP + Dossiers confiés */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopApporteursWidget data={topApporteursForWidget} />
        <FlopApporteursWidget data={flopApporteursForWidget} />
        <DossiersConfiesWidget dossiers={widgetsData?.dossiersConfiesParApporteur || []} />
      </div>

      {/* Types d'apporteurs + Segmentation - STATIA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TypesApporteursWidget data={typesApporteursStats} mode="chartOnly" />
        <SegmentationChart data={segmentationData} />
      </div>

      {/* 7 briques types apporteurs + clients directs - STATIA */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 items-stretch">
        <TypesApporteursWidget data={typesApporteursStats} mode="cardsOnly" />
        <ParticuliersWidget stats={particuliersStats} />
      </div>

      {/* Timeline (legacy) */}
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
