import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useIndicateursUniversStatia } from "@/apogee-connect/hooks/useIndicateursUniversStatia";
import { UniversKpiCard } from "@/apogee-connect/components/widgets/UniversKpiCard";
import { UniversStackedChart } from "@/apogee-connect/components/widgets/UniversStackedChart";
import { UniversDossiersChart } from "@/apogee-connect/components/widgets/UniversDossiersChart";
import { UniversTransfoChart } from "@/apogee-connect/components/widgets/UniversTransfoChart";
import { UniversApporteurMatrix } from "@/apogee-connect/components/widgets/UniversApporteurMatrix";
import { Skeleton } from "@/components/ui/skeleton";

export function UniversTab() {
  const { isAgencyReady } = useAgency();
  const { data, isLoading } = useIndicateursUniversStatia();

  if (!isAgencyReady || isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-full min-h-[400px]" />
          </div>
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
  const universesMap = new Map(universes.map(u => [u.slug, u]));

  if (stats.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] border-2 border-dashed border-muted rounded-2xl">
        <div className="text-center space-y-4">
          <p className="text-2xl font-semibold text-muted-foreground">Aucune donnée disponible</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Aucun univers trouvé pour la période sélectionnée
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Layout avec tuiles + graphique empilé */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Tuiles univers */}
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
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

        {/* Graphique empilé */}
        <div className="lg:col-span-2">
          <UniversStackedChart 
            data={monthlyCA}
            universes={universes}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Graphiques dossiers et transformation */}
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
