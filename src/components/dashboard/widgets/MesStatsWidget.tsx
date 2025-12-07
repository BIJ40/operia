/**
 * Widget Mes Stats Technicien - Affiche les statistiques personnelles du technicien
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getMetricForAgency } from '@/statia/api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Target, Wrench, Clock } from 'lucide-react';
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
    <div className="flex items-center gap-3 p-2 rounded-lg bg-accent/30">
      <div className={cn("p-2 rounded-lg", color)}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

export function MesStatsWidget() {
  const { user, agence } = useAuth();
  const agencySlug = agence || '';

  const now = new Date();
  const dateRange = {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };

  const services = getGlobalApogeeDataServices();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['widget-mes-stats', agencySlug, user?.id],
    queryFn: async () => {
      if (!agencySlug || !user?.id) return null;

      const [caParTech, nbInterventions] = await Promise.all([
        getMetricForAgency('ca_par_technicien', agencySlug, { dateRange }, services),
        getMetricForAgency('nb_interventions', agencySlug, { dateRange }, services),
      ]);

      return {
        caParTech: caParTech || {},
        nbInterventions: typeof nbInterventions === 'number' ? nbInterventions : 0,
      };
    },
    enabled: !!agencySlug && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  // Trouver le CA du technicien connecté
  const firstName = user?.user_metadata?.first_name || '';
  const lastName = user?.user_metadata?.last_name || '';
  const technicianName = `${firstName} ${lastName}`.trim();
  
  // stats.caParTech peut être un objet avec les techniciens
  let myCA = 0;
  if (stats?.caParTech && typeof stats.caParTech === 'object') {
    const techData = stats.caParTech as Record<string, { ca?: number; name?: string }>;
    for (const [key, value] of Object.entries(techData)) {
      if (key.toLowerCase().includes(technicianName.toLowerCase()) || 
          (value?.name && value.name.toLowerCase().includes(technicianName.toLowerCase()))) {
        myCA = value?.ca || 0;
        break;
      }
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCard
        icon={TrendingUp}
        label="Mon CA du mois"
        value={formatCurrency(myCA)}
        color="bg-helpconfort-blue"
      />
      <StatCard
        icon={Wrench}
        label="Interventions"
        value={stats?.nbInterventions || 0}
        color="bg-helpconfort-orange"
      />
      <StatCard
        icon={Target}
        label="Objectif"
        value="–"
        color="bg-violet-500"
      />
      <StatCard
        icon={Clock}
        label="Temps moyen"
        value="–"
        color="bg-green-500"
      />
    </div>
  );
}
