/**
 * Widget Top 3 Techniciens - utilise la période du dashboard
 */

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { getMetricForAgency } from '@/statia/api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Trophy, Medal } from 'lucide-react';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import { useDashboardPeriod } from '@/pages/DashboardStatic';

interface TechnicianData {
  id: string | number;
  name: string;
  ca: number;
  color?: string;
}

export function Top3TechniciensWidget() {
  const { agence } = useProfile();
  const agencySlug = agence || '';

  // Utiliser la période du dashboard parent
  const { dateRange, periodLabel } = useDashboardPeriod();

  const services = getGlobalApogeeDataServices();

  const { data, isLoading } = useQuery({
    queryKey: ['widget-top3-techniciens', agencySlug, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!agencySlug) return null;
      return getMetricForAgency('ca_par_technicien', agencySlug, { dateRange }, services);
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  // Parser les données retournées par StatIA
  const technicians: TechnicianData[] = [];
  
  if (data) {
    const dataObj = data.value ?? data;
    
    if (dataObj && typeof dataObj === 'object' && !Array.isArray(dataObj)) {
      Object.entries(dataObj as Record<string, unknown>).forEach(([key, val]) => {
        if (key === 'value' || key === 'metadata' || key === 'breakdown') return;
        if (key === 'agence' || key === 'Agence / Non attribué') return;
        
        if (typeof val === 'object' && val !== null) {
          const item = val as { name?: string; totalCA?: number; ca?: number; color?: string };
          const caValue = item.totalCA ?? item.ca ?? 0;
          if (caValue > 0) {
            technicians.push({
              id: key,
              name: item.name || key,
              ca: caValue,
              color: item.color,
            });
          }
        } else if (typeof val === 'number' && val > 0) {
          technicians.push({ id: key, name: key, ca: val });
        }
      });
    }
  }

  // Trier par CA décroissant et prendre les 3 premiers
  technicians.sort((a, b) => b.ca - a.ca);
  const top3 = technicians.slice(0, 3);

  if (!top3.length) {
    return (
      <div className="flex items-center justify-center h-full min-h-[100px] text-muted-foreground text-sm">
        Aucune donnée disponible
      </div>
    );
  }

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return { 
          bg: 'bg-gradient-to-br from-yellow-400 to-amber-500', 
          text: 'text-yellow-50',
          icon: Trophy,
          ringColor: 'ring-yellow-400/30'
        };
      case 1:
        return { 
          bg: 'bg-gradient-to-br from-slate-300 to-slate-400', 
          text: 'text-slate-50',
          icon: Medal,
          ringColor: 'ring-slate-400/30'
        };
      case 2:
        return { 
          bg: 'bg-gradient-to-br from-amber-600 to-orange-700', 
          text: 'text-amber-50',
          icon: Medal,
          ringColor: 'ring-amber-600/30'
        };
      default:
        return { 
          bg: 'bg-muted', 
          text: 'text-muted-foreground',
          icon: Medal,
          ringColor: 'ring-muted/30'
        };
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground text-center capitalize">{periodLabel}</p>
      
      {top3.map((tech, index) => {
        const rankStyle = getRankStyle(index);
        const RankIcon = rankStyle.icon;
        
        return (
          <div 
            key={tech.id} 
            className={`flex items-center gap-3 p-3 rounded-lg ring-2 ${rankStyle.ringColor} bg-card hover:bg-accent/50 transition-colors`}
          >
            {/* Rank Badge */}
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${rankStyle.bg} ${rankStyle.text} shrink-0`}>
              {index === 0 ? (
                <RankIcon className="h-5 w-5" />
              ) : (
                <span className="text-sm font-bold">{index + 1}</span>
              )}
            </div>
            
            {/* Name & CA */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{tech.name}</p>
              <p className="text-primary font-bold">{formatEuros(tech.ca)}</p>
            </div>
            
            {/* Color indicator if available */}
            {tech.color && (
              <div 
                className="w-3 h-3 rounded-full shrink-0" 
                style={{ backgroundColor: tech.color }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
