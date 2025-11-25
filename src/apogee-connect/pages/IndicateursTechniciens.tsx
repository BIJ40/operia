import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataService } from "@/apogee-connect/services/dataService";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { SecondaryPeriodSelector } from "@/apogee-connect/components/filters/SecondaryPeriodSelector";
import { calculateTechnicienUniversStats } from "@/apogee-connect/utils/technicienUniversCalculations";
import { EnrichmentService } from "@/apogee-connect/services/enrichmentService";
import { TechnicienUniversHeatmap } from "@/apogee-connect/components/widgets/TechnicienUniversHeatmap";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function IndicateursTechniciens() {
  const { isAgencyReady } = useAgency();
  const { isAuthLoading } = useAuth();
  const { filters } = useSecondaryFilters();
  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["apogee-technicien-univers-stats", filters.dateRange],
    queryFn: async () => {
      const rawData = await DataService.loadAllData();
      
      // Initialiser le service d'enrichissement
      EnrichmentService.initialize(rawData);
      
      // Calculer les stats par technicien et univers
      const stats = calculateTechnicienUniversStats(
        rawData.factures,
        rawData.projects,
        rawData.interventions,
        rawData.users,
        filters.dateRange
      );
      
      return { stats, universes: EnrichmentService.getAllUniverses() };
    },
    enabled: isAgencyReady && !isAuthLoading,
  });

  if (isAuthLoading || !isAgencyReady) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  const stats = data?.stats || [];
  const universes = data?.universes || [];

  return (
    <div className="space-y-8">
      {/* En-tête avec titre et sélecteur de période */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            Techniciens par univers
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Analyse croisée du CA, des heures et de la performance par technicien et domaine
          </p>
        </div>
        <SecondaryPeriodSelector />
      </div>

      {/* Onglets pour choisir la vue */}
      {isLoading ? (
        <Skeleton className="h-[600px] w-full" />
      ) : stats.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px] border-2 border-dashed border-muted rounded-2xl">
          <div className="text-center space-y-4">
            <p className="text-2xl font-semibold text-muted-foreground">Aucune donnée disponible</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Aucune activité trouvée pour la période sélectionnée
            </p>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="ca" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="ca">CA HT</TabsTrigger>
            <TabsTrigger value="heures">Heures</TabsTrigger>
            <TabsTrigger value="caParHeure">CA/Heure</TabsTrigger>
          </TabsList>

          <TabsContent value="ca">
            <TechnicienUniversHeatmap
              data={stats}
              universes={universes}
              loading={isLoading}
              mode="ca"
              showInactive={showInactive}
              onToggleInactive={setShowInactive}
            />
          </TabsContent>

          <TabsContent value="heures">
            <TechnicienUniversHeatmap
              data={stats}
              universes={universes}
              loading={isLoading}
              mode="heures"
              showInactive={showInactive}
              onToggleInactive={setShowInactive}
            />
          </TabsContent>

          <TabsContent value="caParHeure">
            <TechnicienUniversHeatmap
              data={stats}
              universes={universes}
              loading={isLoading}
              mode="caParHeure"
              showInactive={showInactive}
              onToggleInactive={setShowInactive}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
