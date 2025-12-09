import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { SecondaryPeriodSelector } from "@/apogee-connect/components/filters/SecondaryPeriodSelector";
import { useIndicateursUniversStatia } from "@/apogee-connect/hooks/useIndicateursUniversStatia";
import { UniversKpiCard } from "@/apogee-connect/components/widgets/UniversKpiCard";
import { UniversStackedChart } from "@/apogee-connect/components/widgets/UniversStackedChart";
import { UniversDossiersChart } from "@/apogee-connect/components/widgets/UniversDossiersChart";
import { UniversTransfoChart } from "@/apogee-connect/components/widgets/UniversTransfoChart";
import { UniversApporteurMatrix } from "@/apogee-connect/components/widgets/UniversApporteurMatrix";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES } from "@/config/routes";

export default function IndicateursUnivers() {
  const { isAgencyReady } = useAgency();
  const { isAuthLoading } = useAuth();

  // Hook StatIA pour les indicateurs univers
  const { data, isLoading } = useIndicateursUniversStatia();

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
  const dossiersParUnivers = data?.dossiersParUnivers || {};
  const transfoParUnivers = data?.transfoParUnivers || {};
  const matrixUniversApporteur = data?.matrixUniversApporteur || {};
  const universes = data?.universes || [];
  const universesMap = new Map(
    universes.map(u => [u.slug, u])
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <PageHeader
        title="Les univers"
        subtitle="Statistiques et performances par univers métier"
        backTo={ROUTES.pilotage.index}
        backLabel="Mon Agence"
        rightElement={<SecondaryPeriodSelector />}
      />

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
              universes={universes}
              loading={isLoading}
            />
          </div>
        </div>
      )}

      {/* Graphiques et analyses supplémentaires */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <UniversDossiersChart
          data={dossiersParUnivers}
          universes={universes}
          loading={isLoading}
        />
        <UniversTransfoChart
          data={transfoParUnivers}
          universes={universes}
          loading={isLoading}
        />
      </div>

      {/* Tableau croisé univers × apporteur */}
      <UniversApporteurMatrix
        data={matrixUniversApporteur}
        universes={universes}
        loading={isLoading}
      />
    </div>
  );
}
