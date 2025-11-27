import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NetworkDataService } from "@/franchiseur/services/networkDataService";
import { useAgencies } from "@/franchiseur/hooks/useAgencies";
import { useFranchiseur } from "@/franchiseur/contexts/FranchiseurContext";
import { useNetworkFilters } from "@/franchiseur/contexts/NetworkFiltersContext";
import { NetworkPeriodSelector } from "@/franchiseur/components/filters/NetworkPeriodSelector";
import { UniversApporteurMatrix } from "@/apogee-connect/components/widgets/UniversApporteurMatrix";
import { TechnicienUniversHeatmap } from "@/apogee-connect/components/widgets/TechnicienUniversHeatmap";
import { 
  aggregateUniversApporteurMatrix, 
  aggregateTechnicienUniversStats,
  type NetworkTechnicienUniversStats 
} from "@/franchiseur/utils/networkCalculations";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Définition des univers avec couleurs
const UNIVERSES = [
  { slug: "plomberie", label: "Plomberie", colorHex: "#3b82f6" },
  { slug: "electricite", label: "Électricité", colorHex: "#f59e0b" },
  { slug: "serrurerie", label: "Serrurerie", colorHex: "#8b5cf6" },
  { slug: "chauffage", label: "Chauffage", colorHex: "#ef4444" },
  { slug: "climatisation", label: "Climatisation", colorHex: "#06b6d4" },
  { slug: "pmr", label: "PMR", colorHex: "#22c55e" },
  { slug: "volet_roulant", label: "Volets roulants", colorHex: "#ec4899" },
  { slug: "electromenager", label: "Électroménager", colorHex: "#84cc16" },
];

// Adapter le type pour le composant TechnicienUniversHeatmap
type TechnicienUniversStats = {
  technicienId: string;
  technicienNom: string;
  technicienColor: string;
  technicienActif: boolean;
  universes: {
    [universSlug: string]: {
      caHT: number;
      heures: number;
      caParHeure: number;
      nbDossiers: number;
    };
  };
  totaux: {
    caHT: number;
    heures: number;
    caParHeure: number;
    nbDossiers: number;
  };
};

export default function FranchiseurStats() {
  const { data: agencies, isLoading: isLoadingAgencies } = useAgencies();
  const { selectedAgencies, isLoading: isLoadingContext } = useFranchiseur();
  const { dateRange } = useNetworkFilters();
  const [showInactive, setShowInactive] = useState(false);
  const [techMode, setTechMode] = useState<"ca" | "heures" | "caParHeure">("ca");

  // Déterminer les agences à charger
  const agenciesToLoad = agencies?.filter(a => {
    if (!a.is_active) return false;
    if (selectedAgencies.length === 0) return true;
    return selectedAgencies.includes(a.id);
  }) || [];

  // Charger les données de toutes les agences
  const { data, isLoading, error } = useQuery({
    queryKey: ["franchiseur-stats-matrices", agenciesToLoad.map(a => a.slug).join(","), dateRange],
    queryFn: async () => {
      if (agenciesToLoad.length === 0) {
        return { universApporteurMatrix: {}, technicienStats: [] };
      }

      // Charger les données de toutes les agences séquentiellement
      const agencySlugs = agenciesToLoad.map(a => a.slug);
      const agencyDataResults = await NetworkDataService.loadMultiAgencyData(agencySlugs, dateRange);

      // Enrichir avec les labels
      const enrichedData = agencyDataResults.map(result => ({
        ...result,
        agencyLabel: agencies?.find(a => a.slug === result.agencyId)?.label || result.agencyId,
      }));

      // Calculer les matrices agrégées
      const universApporteurMatrix = aggregateUniversApporteurMatrix(
        enrichedData,
        { start: dateRange.from, end: dateRange.to }
      );

      const technicienStats = aggregateTechnicienUniversStats(
        enrichedData,
        { start: dateRange.from, end: dateRange.to }
      );

      return { universApporteurMatrix, technicienStats };
    },
    enabled: !isLoadingAgencies && !isLoadingContext && agenciesToLoad.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoadingAgencies || isLoadingContext) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Adapter les stats technicien pour le composant
  const adaptedTechStats: TechnicienUniversStats[] = (data?.technicienStats || []).map(stat => ({
    technicienId: stat.technicienId,
    technicienNom: stat.technicienNom,
    technicienColor: stat.technicienColor,
    technicienActif: stat.technicienActif,
    universes: stat.universes,
    totaux: stat.totaux,
  }));

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            Statistiques Détaillées
          </h1>
          <p className="text-muted-foreground mt-2">
            Matrices de performance Univers × Apporteurs et Univers × Techniciens
          </p>
        </div>
        <NetworkPeriodSelector />
      </div>

      {/* Info agences */}
      {agenciesToLoad.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Données agrégées de <span className="font-semibold text-foreground">{agenciesToLoad.length}</span> agence{agenciesToLoad.length > 1 ? 's' : ''}
              </span>
              {isLoading && (
                <div className="flex items-center gap-2">
                  <Progress value={33} className="w-32 h-2" />
                  <span className="text-xs text-muted-foreground">Chargement...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4 text-destructive">
            Erreur lors du chargement des données: {String(error)}
          </CardContent>
        </Card>
      )}

      {/* Matrice Univers × Apporteurs */}
      <UniversApporteurMatrix
        data={data?.universApporteurMatrix || {}}
        universes={UNIVERSES}
        loading={isLoading}
      />

      {/* Matrice Univers × Techniciens */}
      <Card>
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            Performance Techniciens × Univers (Réseau)
          </CardTitle>
          <CardDescription>
            Analyse croisée du CA, des heures et de la performance par technicien et domaine d'intervention sur l'ensemble du réseau
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : adaptedTechStats.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Aucune donnée disponible
            </div>
          ) : (
            <Tabs value={techMode} onValueChange={(v) => setTechMode(v as any)} className="space-y-4">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="ca">CA HT</TabsTrigger>
                <TabsTrigger value="heures">Heures</TabsTrigger>
                <TabsTrigger value="caParHeure">CA/Heure</TabsTrigger>
              </TabsList>

              <TabsContent value="ca">
                <TechnicienUniversHeatmap
                  data={adaptedTechStats}
                  universes={UNIVERSES}
                  loading={false}
                  mode="ca"
                  showInactive={showInactive}
                  onToggleInactive={setShowInactive}
                />
              </TabsContent>

              <TabsContent value="heures">
                <TechnicienUniversHeatmap
                  data={adaptedTechStats}
                  universes={UNIVERSES}
                  loading={false}
                  mode="heures"
                  showInactive={showInactive}
                  onToggleInactive={setShowInactive}
                />
              </TabsContent>

              <TabsContent value="caParHeure">
                <TechnicienUniversHeatmap
                  data={adaptedTechStats}
                  universes={UNIVERSES}
                  loading={false}
                  mode="caParHeure"
                  showInactive={showInactive}
                  onToggleInactive={setShowInactive}
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
