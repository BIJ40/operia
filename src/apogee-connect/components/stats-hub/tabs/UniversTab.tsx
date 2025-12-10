import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useIndicateursUniversStatia } from "@/apogee-connect/hooks/useIndicateursUniversStatia";
import { UniversCarousel } from "@/apogee-connect/components/widgets/UniversCarousel";
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <Skeleton className="h-64" />
          </div>
          <div className="lg:col-span-3">
            <Skeleton className="h-64" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
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
    <div className="space-y-6">
      {/* Layout with carousel + stacked chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Universe cards carousel (2 at a time) */}
        <div className="lg:col-span-2">
          <UniversCarousel 
            stats={stats}
            universes={universes}
          />
        </div>

        {/* Stacked area chart */}
        <div className="lg:col-span-3">
          <UniversStackedChart 
            data={monthlyCA}
            universes={universes}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Charts for dossiers and transformation */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
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

      {/* Universe x Apporteur matrix */}
      <UniversApporteurMatrix
        data={matrixUniversApporteur}
        universes={universes}
        loading={isLoading}
      />
    </div>
  );
}
