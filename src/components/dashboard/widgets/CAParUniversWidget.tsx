/**
 * Widget CA par Univers — Grille 2×4 avec pictos et barres circulaires
 */

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { getMetricForAgency } from '@/statia/api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardPeriod } from '@/pages/DashboardStatic';
import { getPictoSrc } from '@/components/commercial/social/templates/templateAssets';

interface UniversData {
  name: string;
  ca: number;
  color?: string;
}

// Mapping nom univers → clé picto
const UNIVERS_PICTO_KEY: Record<string, string> = {
  plomberie: 'plomberie',
  electricite: 'electricite',
  électricité: 'electricite',
  serrurerie: 'serrurerie',
  menuiserie: 'menuiserie',
  vitrerie: 'vitrerie',
  'volets roulants': 'volets',
  volets: 'volets',
  volet: 'volets',
  pmr: 'pmr',
  renovation: 'renovation',
  rénovation: 'renovation',
};

function getUniversPicto(name: string): string | undefined {
  const norm = name.toLowerCase().trim();
  for (const [pattern, key] of Object.entries(UNIVERS_PICTO_KEY)) {
    if (norm.includes(pattern)) return getPictoSrc(key);
  }
  return undefined;
}

function RingProgress({ percentage, pictoSrc, size = 64 }: { percentage: number; pictoSrc?: string; size?: number }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          className="opacity-30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {pictoSrc ? (
          <img src={pictoSrc} alt="" className="w-7 h-7 object-contain" />
        ) : (
          <span className="text-xs font-bold text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
}

export function CAParUniversWidget() {
  const { agence } = useProfile();
  const agencySlug = agence || '';
  const { dateRange } = useDashboardPeriod();
  const services = getGlobalApogeeDataServices();

  const { data, isLoading } = useQuery({
    queryKey: ['widget-ca-univers', agencySlug, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!agencySlug) return null;
      return getMetricForAgency('ca_par_univers', agencySlug, { dateRange }, services);
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
    );
  }

  const universData: UniversData[] = [];

  if (data) {
    const dataObj = data.value ?? data;
    if (dataObj && typeof dataObj === 'object' && !Array.isArray(dataObj)) {
      Object.entries(dataObj as Record<string, unknown>).forEach(([key, val]) => {
        if (key === 'value' || key === 'metadata' || key === 'breakdown') return;
        if (typeof val === 'object' && val !== null) {
          const item = val as { name?: string; ca?: number; color?: string };
          if (item.ca !== undefined) {
            universData.push({ name: item.name || key, ca: item.ca, color: item.color });
          }
        } else if (typeof val === 'number') {
          universData.push({ name: key, ca: val });
        }
      });
    }
  }

  universData.sort((a, b) => b.ca - a.ca);
  const total = universData.reduce((sum, u) => sum + u.ca, 0);

  if (!universData.length) {
    return (
      <div className="flex items-center justify-center h-full min-h-[100px] text-muted-foreground text-sm">
        Aucune donnée disponible
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="grid grid-cols-2 gap-3">
      {universData.slice(0, 8).map((univers, index) => {
        const percentage = total > 0 ? (univers.ca / total) * 100 : 0;
        const pictoSrc = getUniversPicto(univers.name);
        return (
          <div key={index} className="flex flex-col items-center gap-1">
            <RingProgress percentage={percentage} pictoSrc={pictoSrc} />
            <span className="text-xs font-medium text-foreground truncate max-w-[80px] text-center">
              {univers.name}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {Math.round(percentage)}% · {formatCurrency(univers.ca)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
