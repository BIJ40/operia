/**
 * Widget Mes Devis/Factures - Pour les assistantes (vendeur)
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getMetricForAgency } from '@/statia/api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Receipt, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { startOfMonth, endOfMonth } from 'date-fns';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
      <div className={cn("p-2 rounded-lg", color)}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}

export function MesDevisFacturesWidget() {
  const { agence } = useAuth();
  const agencySlug = agence || '';

  const now = new Date();
  const dateRange = {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };

  const services = getGlobalApogeeDataServices();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['widget-devis-factures', agencySlug],
    queryFn: async () => {
      if (!agencySlug) return null;

      const [nbDevis, nbFactures, tauxTransfo] = await Promise.all([
        getMetricForAgency('nb_devis', agencySlug, { dateRange }, services),
        getMetricForAgency('nb_factures', agencySlug, { dateRange }, services),
        getMetricForAgency('taux_transformation_devis_nombre', agencySlug, { dateRange }, services),
      ]);

      return {
        nbDevis: typeof nbDevis === 'number' ? nbDevis : 0,
        nbFactures: typeof nbFactures === 'number' ? nbFactures : 0,
        tauxTransfo: typeof tauxTransfo === 'number' ? tauxTransfo : 0,
      };
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  const formatPercent = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  return (
    <div className="space-y-3">
      <StatCard
        icon={FileText}
        label="Devis ce mois"
        value={stats?.nbDevis || 0}
        color="bg-helpconfort-blue"
      />
      <StatCard
        icon={Receipt}
        label="Factures ce mois"
        value={stats?.nbFactures || 0}
        color="bg-helpconfort-orange"
      />
      <StatCard
        icon={TrendingUp}
        label="Taux de transformation"
        value={stats?.tauxTransfo ? formatPercent(stats.tauxTransfo) : '–'}
        color="bg-green-500"
      />
    </div>
  );
}
