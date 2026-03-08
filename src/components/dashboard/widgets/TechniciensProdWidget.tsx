/**
 * Widget Productivité Techniciens - utilise la période du dashboard
 */

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { getMetricForAgency } from '@/statia/api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import { useDashboardPeriod } from '@/pages/DashboardStatic';

interface TechData {
  id: string;
  name: string;
  ca: number;
  color?: string;
}

export function TechniciensProdWidget() {
  const { agence } = useProfile();
  const agencySlug = agence || '';

  // Utiliser la période du dashboard parent
  const { dateRange } = useDashboardPeriod();

  const services = getGlobalApogeeDataServices();

  const { data, isLoading } = useQuery({
    queryKey: ['widget-tech-prod', agencySlug, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!agencySlug) return null;
      
      const [caResult, moyenResult] = await Promise.all([
        getMetricForAgency('ca_par_technicien', agencySlug, { dateRange }, services),
        getMetricForAgency('ca_moyen_par_tech', agencySlug, { dateRange }, services),
      ]);
      
      return {
        techs: caResult.value as Record<string, unknown> | null,
        moyenne: Number(moyenResult.value) || 0,
        nbTechs: (moyenResult.breakdown as any)?.nbTechActifs || 0,
      };
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-6" />
        ))}
      </div>
    );
  }

  // Parser les données techniciens
  const techData: TechData[] = [];
  
  if (data?.techs && typeof data.techs === 'object') {
    Object.entries(data.techs).forEach(([key, val]) => {
      if (key === 'value' || key === 'metadata' || key === 'breakdown') return;
      
      if (typeof val === 'object' && val !== null) {
        const item = val as { name?: string; ca?: number; color?: string };
        if (item.ca !== undefined) {
          techData.push({
            id: key,
            name: item.name || key,
            ca: item.ca,
            color: item.color,
          });
        }
      } else if (typeof val === 'number') {
        techData.push({ id: key, name: key, ca: val });
      }
    });
  }

  // Trier par CA décroissant
  techData.sort((a, b) => b.ca - a.ca);

  const moyenne = data?.moyenne ?? 0;
  const nbTechs = data?.nbTechs ?? techData.length;

  if (!techData.length) {
    return (
      <div className="flex items-center justify-center h-full min-h-[100px] text-muted-foreground text-sm">
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2">
      {/* Résumé */}
      <div className="flex justify-between items-center bg-muted/50 rounded-lg px-3 py-2">
        <div className="text-xs">
          <span className="text-muted-foreground">Moyenne/tech:</span>
          <span className="font-semibold ml-1">{formatEuros(moyenne)}</span>
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">Actifs:</span>
          <span className="font-semibold ml-1">{nbTechs}</span>
        </div>
      </div>

      {/* Liste techniciens */}
      <div className="space-y-1.5">
        {techData.slice(0, 5).map((tech, index) => (
          <div 
            key={tech.id} 
            className="flex justify-between items-center text-sm py-1 border-b border-border/50 last:border-0"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {index + 1}
              </span>
              <span className="truncate max-w-[120px]">{tech.name}</span>
            </div>
            <span className="font-semibold">{formatEuros(tech.ca)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
