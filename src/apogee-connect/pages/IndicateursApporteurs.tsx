import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataService } from "@/apogee-connect/services/dataService";
import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { useApiToggle } from "@/apogee-connect/contexts/ApiToggleContext";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { Card } from "@/components/ui/card";
import { FolderOpen, Euro, Percent, ShoppingCart, Clock, Users, TrendingUp, Heart, ArrowUpRight } from "lucide-react";
import { formatEuros, formatApporteurType } from "@/apogee-connect/utils/formatters";
import { SecondaryPeriodSelector } from "@/apogee-connect/components/filters/SecondaryPeriodSelector";
import { 
  calculateTop10Apporteurs, 
  calculateDossiersConfiesParApporteur, 
  calculateDuGlobal, 
  calculateFlop10Apporteurs,
  calculateTauxTransformationMoyen,
  calculatePanierMoyenHT,
  calculateDelaiMoyenFacturation
} from "@/apogee-connect/utils/apporteursCalculations";
import { calculateTypesApporteursStats } from "@/apogee-connect/utils/typesApporteursCalculations";
import { calculateParticuliersStats } from "@/apogee-connect/utils/particuliersCalculations";
import { calculateMonthlySegmentation } from "@/apogee-connect/utils/segmentationCalculations";
import {
  calculateApporteursActifs,
  calculateCAMoyenParApporteur,
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

export default function IndicateursApporteurs() {
  const { filters: secondaryFilters } = useSecondaryFilters();
  const { isApiEnabled } = useApiToggle();
  const { agencyChangeCounter, currentAgency, isAgencyReady } = useAgency();
  const userAgency = currentAgency?.id || "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["apporteurs-stats", secondaryFilters, isApiEnabled, agencyChangeCounter],
    enabled: isAgencyReady && isApiEnabled,
    queryFn: async () => {
      // GUARD: Ne pas charger si l'agence n'est pas définie
      if (!currentAgency?.id) {
        console.warn('⚠️ Agence non définie - Chargement des données annulé');
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
      
      const duGlobal = calculateDuGlobal(
        apiData.factures || [],
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
      
      // Calculer l'évolution mensuelle Particuliers vs Apporteurs
      // Ce graphique est TOTALEMENT INDÉPENDANT du sélecteur de période
      // Il affiche TOUJOURS l'année en cours complète
      const currentYear = new Date().getFullYear();
      const segmentationData = calculateMonthlySegmentation(
        apiData.factures || [],
        apiData.clients || [],
        apiData.projects || [],
        currentYear
      );
      
      const tauxTransformationMoyen = calculateTauxTransformationMoyen(
        apiData.devis || [],
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      const panierMoyenHT = calculatePanierMoyenHT(
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      const delaiMoyenFacturation = calculateDelaiMoyenFacturation(
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      return {
        top10Apporteurs,
        dossiersConfiesParApporteur,
        duGlobal,
        flop10Apporteurs,
        typesApporteursStats,
        particuliersStats,
        segmentationData,
        tauxTransformationMoyen,
        panierMoyenHT,
        delaiMoyenFacturation,
        rawProjects: apiData.projects || [],
        rawClients: apiData.clients || [],
        apiGetFactures: apiData.factures || [],
        apiGetProjects: apiData.projects || []
      };
    },
  });

  // Calculs des 5 nouveaux KPI étendus
  const apporteursActifs = useMemo(() => {
    if (!data || !data.apiGetFactures || !data.apiGetProjects) return { nbActifs: 0 };
    return calculateApporteursActifs(data.apiGetFactures, data.apiGetProjects, secondaryFilters.dateRange);
  }, [data, secondaryFilters.dateRange]);

  const caMoyenApporteur = useMemo(() => {
    if (!data || !data.apiGetFactures || !data.apiGetProjects) return { caMoyen: 0, caTotal: 0, nbApporteurs: 0 };
    return calculateCAMoyenParApporteur(data.apiGetFactures, data.apiGetProjects, secondaryFilters.dateRange);
  }, [data, secondaryFilters.dateRange]);

  const delaiPaiement = useMemo(() => {
    if (!data || !data.apiGetFactures || !data.apiGetProjects) return { delaiMoyen: 0, nbFactures: 0 };
    return calculateDelaiMoyenPaiement(data.apiGetFactures, data.apiGetProjects, secondaryFilters.dateRange);
  }, [data, secondaryFilters.dateRange]);

  const tauxFidelite = useMemo(() => {
    if (!data || !data.apiGetFactures || !data.apiGetProjects) return { tauxFidelite: 0, nbRecurrents: 0, nbTotal: 0, hasDataN1: false };
    return calculateTauxFidelite(data.apiGetFactures, data.apiGetProjects, secondaryFilters.dateRange);
  }, [data, secondaryFilters.dateRange]);

  const croissanceCA = useMemo(() => {
    if (!data || !data.apiGetFactures || !data.apiGetProjects) return { croissance: 0, caPeriodeN: 0, caPeriodeN1: 0, hasDataN1: false };
    return calculateCroissanceCA(data.apiGetFactures, data.apiGetProjects, secondaryFilters.dateRange);
  }, [data, secondaryFilters.dateRange]);

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
    console.error('Erreur de chargement des données apporteurs:', error);
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
          Les apporteurs
        </h1>
        <SecondaryPeriodSelector />
      </div>

      {/* Métriques clés en 5 cartes horizontales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Carte 1: Dû global */}
        <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-orange-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-1.5 rounded-lg">
              <Euro className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Dû global TTC</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-orange-500">{formatEuros(data?.duGlobal || 0)}</p>
            <p className="text-xs text-muted-foreground">à encaisser</p>
          </div>
        </Card>

        {/* Carte 2: Total dossiers confiés */}
        <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-blue-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-1.5 rounded-lg">
              <FolderOpen className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Dossiers confiés</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-blue-500">
              {data?.dossiersConfiesParApporteur?.reduce((sum, d) => sum + d.nbDossiers, 0) || 0}
            </p>
            <p className="text-xs text-muted-foreground">total période</p>
          </div>
        </Card>

        {/* Carte 3: Taux de transformation moyen */}
        <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-purple-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-1.5 rounded-lg">
              <Percent className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Taux de transfo moyen</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-purple-500">{(data?.tauxTransformationMoyen || 0).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Devis → Factures</p>
          </div>
        </Card>

        {/* Carte 4: Panier moyen HT */}
        <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-green-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-1.5 rounded-lg">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Panier moyen HT</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-green-500">{formatEuros(data?.panierMoyenHT || 0)}</p>
            <p className="text-xs text-muted-foreground">Dossier apporteur</p>
          </div>
        </Card>

        {/* Carte 5: Délai moyen */}
        <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-indigo-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-1.5 rounded-lg">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Délai moyen</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-indigo-500">{Math.round(data?.delaiMoyenFacturation || 0)} j</p>
            <p className="text-xs text-muted-foreground">Dossier → Facture</p>
          </div>
        </Card>
      </div>

      {/* 5 nouveaux KPI avec données réelles */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* KPI 6: Nombre d'apporteurs actifs */}
        <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-cyan-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 p-1.5 rounded-lg">
              <Users className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Apporteurs actifs</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-cyan-500">{apporteursActifs.nbActifs}</p>
            <p className="text-xs text-muted-foreground">sur la période</p>
          </div>
        </Card>

        {/* KPI 7: CA moyen par apporteur */}
        <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-pink-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-1.5 rounded-lg">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">CA moyen / Apporteur</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-pink-500">{formatEuros(caMoyenApporteur.caMoyen)}</p>
            <p className="text-xs text-muted-foreground">moyenne HT</p>
          </div>
        </Card>

        {/* KPI 8: Délai moyen de paiement */}
        <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-amber-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-1.5 rounded-lg">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Délai paiement</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-amber-500">{delaiPaiement.delaiMoyen} j</p>
            <p className="text-xs text-muted-foreground">moyen</p>
          </div>
        </Card>

        {/* KPI 9: Taux de fidélité */}
        <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-emerald-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-1.5 rounded-lg">
              <Heart className="w-4 h-4 text-white" />
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
        </Card>

        {/* KPI 10: Croissance CA */}
        <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-violet-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-gradient-to-br from-violet-500 to-violet-600 p-1.5 rounded-lg">
              <ArrowUpRight className="w-4 h-4 text-white" />
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
        </Card>
      </div>

      {/* Widgets TOP/FLOP + Dossiers confiés */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopApporteursWidget data={data?.top10Apporteurs || []} />
        <FlopApporteursWidget data={data?.flop10Apporteurs || []} />
        <DossiersConfiesWidget dossiers={data?.dossiersConfiesParApporteur || []} />
      </div>

      {/* Widget Types d'apporteurs + Graphique Segmentation (2 colonnes) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TypesApporteursWidget data={data?.typesApporteursStats || []} mode="chartOnly" />
        <SegmentationChart data={data?.segmentationData || []} />
      </div>

      {/* 7 briques alignées : 6 types d'apporteurs + clients directs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {data?.typesApporteursStats?.map((stat, index) => (
          <Card 
            key={stat.type}
            className="hover:shadow-lg transition-shadow cursor-pointer h-full p-3"
            style={{ borderLeft: `4px solid ${['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--blue-dark))', 'hsl(var(--blue-light))', 'hsl(40 90% 60%)'][index % 5]}` }}
          >
            <div className="space-y-2">
              <p className="text-xs font-bold truncate">{formatApporteurType(stat.type)}</p>
              <p className="text-lg font-bold" style={{ color: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--blue-dark))', 'hsl(var(--blue-light))', 'hsl(40 90% 60%)'][index % 5] }}>
                {formatEuros(stat.caHT)}
              </p>
            </div>
          </Card>
        ))}
        
        {/* Carte Clients Directs */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full p-3" style={{ borderLeft: '4px solid hsl(var(--primary))' }}>
          <div className="space-y-2">
            <p className="text-xs font-bold">Clients Directs</p>
            <p className="text-lg font-bold text-primary">
              {formatEuros(data?.particuliersStats?.caHT || 0)}
            </p>
          </div>
        </Card>
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
          projects={data?.rawProjects || []} 
          clients={data?.rawClients || []} 
        />
      </div>
    </div>
  );
}
