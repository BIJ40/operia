import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NetworkDataService } from "@/franchiseur/services/networkDataService";
import { useAgencies } from "@/franchiseur/hooks/useAgencies";
import { useFranchiseur } from "@/franchiseur/contexts/FranchiseurContext";
import { useNetworkFilters } from "@/franchiseur/contexts/NetworkFiltersContext";
import { NetworkPeriodSelector } from "@/franchiseur/components/filters/NetworkPeriodSelector";
import { UniversApporteurMatrix } from "@/apogee-connect/components/widgets/UniversApporteurMatrix";
import { TechnicienUniversHeatmap } from "@/apogee-connect/components/widgets/TechnicienUniversHeatmap";
import { aggregateUniversApporteurMatrix } from "@/franchiseur/utils/networkCalculations";
import { aggregateTechUniversStatsMultiAgency, type TechUniversStats } from "@/shared/utils/technicienUniversEngine";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Définition des univers avec couleurs (alignées sur enrichmentService.ts)
const UNIVERSES = [
  { slug: "pmr", label: "PMR", colorHex: "#2B15E0" },
  { slug: "volet_roulant", label: "Volets roulants", colorHex: "#9817F0" },
  { slug: "renovation", label: "Rénovation", colorHex: "#A38D77" },
  { slug: "electricite", label: "Électricité", colorHex: "#FD9A2C" },
  { slug: "plomberie", label: "Plomberie", colorHex: "#3BA6FF" },
  { slug: "serrurerie", label: "Serrurerie", colorHex: "#FF12BD" },
  { slug: "vitrerie", label: "Vitrerie", colorHex: "#7FFE2E" },
  { slug: "menuiserie", label: "Menuiserie", colorHex: "#FF7018" },
  // RÈGLE STRICTE: chauffage et climatisation N'EXISTENT PAS dans l'API Apogée
];

export default function FranchiseurStats() {
  const { data: agencies, isLoading: isLoadingAgencies } = useAgencies();
  const { selectedAgencies, isLoading: isLoadingContext } = useFranchiseur();
  const { dateRange } = useNetworkFilters();
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

      // Calculer la matrice Univers × Apporteurs
      const universApporteurMatrix = aggregateUniversApporteurMatrix(
        enrichedData,
        { start: dateRange.from, end: dateRange.to }
      );

      // Calculer les stats Technicien × Univers via le moteur unifié
      // Préparer les données pour le nouveau format attendu par le moteur
      const agenciesDataForStats = enrichedData
        .filter(agency => agency.data?.factures && agency.data?.projects && agency.data?.interventions && agency.data?.users)
        .map(agency => ({
          factures: agency.data.factures,
          projects: agency.data.projects,
          interventions: agency.data.interventions,
          users: agency.data.users,
        }));

      const technicienStats = aggregateTechUniversStatsMultiAgency(
        agenciesDataForStats,
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

  // Adapter les stats technicien pour le composant - TOP 5 uniquement
  const adaptedTechStats: TechUniversStats[] = (data?.technicienStats || [])
    .slice(0, 5); // TOP 5 techniciens par CA

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
        <div className="rounded-xl border border-helpconfort-blue/15 p-4
          bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white dark:via-background dark:to-background
          shadow-sm border-l-4 border-l-helpconfort-blue">
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
        </div>
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
      <div className="rounded-xl border border-helpconfort-blue/15 p-6
        bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white dark:via-background dark:to-background
        shadow-sm border-l-4 border-l-helpconfort-blue">
        <div className="mb-4">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            TOP 5 Collaborateurs du Réseau
          </h3>
          <p className="text-sm text-muted-foreground">
            Meilleurs collaborateurs par CA, heures et performance sur l'ensemble du réseau
          </p>
        </div>
        <div>
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
                  showInactive={false}
                  hideInactiveToggle
                />
              </TabsContent>

              <TabsContent value="heures">
                <TechnicienUniversHeatmap
                  data={adaptedTechStats}
                  universes={UNIVERSES}
                  loading={false}
                  mode="heures"
                  showInactive={false}
                  hideInactiveToggle
                />
              </TabsContent>

              <TabsContent value="caParHeure">
                <TechnicienUniversHeatmap
                  data={adaptedTechStats}
                  universes={UNIVERSES}
                  loading={false}
                  mode="caParHeure"
                  showInactive={false}
                  hideInactiveToggle
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
