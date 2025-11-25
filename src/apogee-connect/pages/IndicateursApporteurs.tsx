import { useQuery } from "@tanstack/react-query";
import { DataService } from "@/apogee-connect/services/dataService";
import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { useApiToggle } from "@/apogee-connect/contexts/ApiToggleContext";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { Card } from "@/components/ui/card";
import { FolderOpen, Euro, Percent, ShoppingCart, Clock } from "lucide-react";
import { formatEuros } from "@/apogee-connect/utils/formatters";
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
import { TopApporteursWidget } from "@/apogee-connect/components/widgets/TopApporteursWidget";
import { DossiersConfiesWidget } from "@/apogee-connect/components/widgets/DossiersConfiesWidget";
import { FlopApporteursWidget } from "@/apogee-connect/components/widgets/FlopApporteursWidget";
import { TypesApporteursWidget } from "@/apogee-connect/components/widgets/TypesApporteursWidget";
import { ParticuliersWidget } from "@/apogee-connect/components/widgets/ParticuliersWidget";
import { SegmentationChart } from "@/apogee-connect/components/widgets/SegmentationChart";

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
      
      // Calculer l'évolution mensuelle Particuliers vs Apporteurs - année dynamique
      const start = secondaryFilters.dateRange?.start;
      const year = start instanceof Date ? start.getFullYear() : new Date().getFullYear();
      const segmentationData = calculateMonthlySegmentation(
        apiData.factures || [],
        apiData.clients || [],
        apiData.projects || [],
        year
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
        delaiMoyenFacturation
      };
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
        <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-blue-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-1.5 rounded-lg">
              <FolderOpen className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Dossiers confiés</p>
          <p className="text-2xl font-bold text-blue-500">
            {data?.dossiersConfiesParApporteur?.reduce((sum, d) => sum + d.nbDossiers, 0) || 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">total période</p>
        </Card>

        {/* Carte 3: Taux de transformation moyen */}
        <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-purple-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-1.5 rounded-lg">
              <Percent className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Taux de transfo moyen</p>
          <p className="text-2xl font-bold text-purple-500">{(data?.tauxTransformationMoyen || 0).toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground mt-1">Devis → Factures</p>
        </Card>

        {/* Carte 4: Panier moyen HT */}
        <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-green-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-1.5 rounded-lg">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Panier moyen HT</p>
          <p className="text-2xl font-bold text-green-500">{formatEuros(data?.panierMoyenHT || 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">Dossier apporteur</p>
        </Card>

        {/* Carte 5: Délai moyen */}
        <Card className="p-4 hover:scale-102 transition-all duration-300 cursor-pointer border-2 hover:border-indigo-500/50 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-1.5 rounded-lg">
              <Clock className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Délai moyen</p>
          <p className="text-2xl font-bold text-indigo-500">{Math.round(data?.delaiMoyenFacturation || 0)} j</p>
          <p className="text-xs text-muted-foreground mt-1">Dossier → Facture</p>
        </Card>
      </div>

      {/* Widgets TOP/FLOP + Dossiers confiés */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopApporteursWidget data={data?.top10Apporteurs || []} />
        <FlopApporteursWidget data={data?.flop10Apporteurs || []} />
        <DossiersConfiesWidget dossiers={data?.dossiersConfiesParApporteur || []} />
      </div>

      {/* Widget Types d'apporteurs - Pleine largeur */}
      <div>
        <TypesApporteursWidget data={data?.typesApporteursStats || []} />
      </div>

      {/* Widgets Particuliers + Segmentation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ParticuliersWidget stats={data?.particuliersStats} />
        <SegmentationChart data={data?.segmentationData || []} />
      </div>
    </div>
  );
}
