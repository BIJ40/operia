import { useQuery } from "@tanstack/react-query";
import { DataService } from "@/apogee-connect/services/dataService";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { SecondaryPeriodSelector } from "@/apogee-connect/components/filters/SecondaryPeriodSelector";
import { calculateUniversStats, calculateMonthlyUniversCA } from "@/apogee-connect/utils/universCalculations";
import { EnrichmentService } from "@/apogee-connect/services/enrichmentService";
import { UniversKpiCard } from "@/apogee-connect/components/widgets/UniversKpiCard";
import { UniversStackedChart } from "@/apogee-connect/components/widgets/UniversStackedChart";
import { Skeleton } from "@/components/ui/skeleton";

export default function IndicateursUnivers() {
  const { isAgencyReady } = useAgency();
  const { isAuthLoading } = useAuth();
  const { filters } = useSecondaryFilters();

  const { data, isLoading } = useQuery({
    queryKey: ["apogee-univers-stats", filters.dateRange],
    queryFn: async () => {
      const rawData = await DataService.loadAllData();
      
      // Initialiser le service d'enrichissement
      EnrichmentService.initialize(rawData);
      
      // Calculer les stats par univers
      const stats = calculateUniversStats(
        rawData.factures,
        rawData.projects,
        rawData.interventions,
        filters.dateRange
      );
      
      // Calculer le CA mensuel par univers
      const monthlyCA = calculateMonthlyUniversCA(
        rawData.factures,
        rawData.projects,
        filters.dateRange
      );
      
      return { stats, monthlyCA, universes: EnrichmentService.getAllUniverses() };
    },
    enabled: isAgencyReady && !isAuthLoading,
  });

  if (isAuthLoading || !isAgencyReady) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const stats = data?.stats || [];
  const monthlyCA = data?.monthlyCA || [];
  const universesMap = new Map(
    data?.universes.map(u => [u.slug, u]) || []
  );

  return (
    <div className="space-y-8">
      {/* En-tête avec titre et sélecteur de période */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            Les univers
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Statistiques et performances par univers métier
          </p>
        </div>
        <SecondaryPeriodSelector />
      </div>

      {/* Layout avec 8 tuiles (4x2) à gauche et graphique à droite */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
          <div className="lg:col-span-2 lg:row-span-2">
            <Skeleton className="h-full min-h-[400px]" />
          </div>
        </div>
      ) : stats.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px] border-2 border-dashed border-muted rounded-2xl">
          <div className="text-center space-y-4">
            <p className="text-2xl font-semibold text-muted-foreground">Aucune donnée disponible</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Aucun univers trouvé pour la période sélectionnée
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* 8 tuiles en grille 4x2 */}
          <div className="lg:col-span-3 grid grid-cols-4 gap-4">
            {stats.map((stat) => {
              const universeRef = universesMap.get(stat.univers);
              return (
                <UniversKpiCard
                  key={stat.univers}
                  stat={stat}
                  color={universeRef?.colorHex || '#6B7280'}
                  label={universeRef?.label || stat.univers}
                  icon={universeRef?.icon || 'HelpCircle'}
                />
              );
            })}
          </div>

          {/* Graphique empilé à droite sur toute la hauteur */}
          <div className="lg:col-span-2 lg:row-span-2">
            <UniversStackedChart 
              data={monthlyCA}
              universes={data?.universes || []}
              loading={isLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
