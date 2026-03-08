/**
 * Widget CA Mensuel - Graphique d'évolution du CA sur l'année
 */

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { Skeleton } from '@/components/ui/skeleton';
import { DataService } from '@/apogee-connect/services/dataService';
import { calculateMonthlyCA } from '@/apogee-connect/utils/monthlyCalculations';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatEuros } from '@/apogee-connect/utils/formatters';

export function CAMensuelChartWidget() {
  const { agence } = useProfile();
  const agencySlug = agence || '';
  const selectedYear = new Date().getFullYear();

  const { data: monthlyData, isLoading } = useQuery({
    queryKey: ['widget-ca-mensuel-chart', agencySlug, selectedYear],
    queryFn: async () => {
      if (!agencySlug) return null;
      
      const apiData = await DataService.loadAllData(true, false, agencySlug);
      const rawData = calculateMonthlyCA(
        apiData.factures || [],
        apiData.clients || [],
        apiData.projects || [],
        selectedYear,
        agencySlug
      );
      
      return rawData.map((item: any) => ({
        month: item.mois || item.month,
        ca: item.ca,
      }));
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <Skeleton className="h-full w-full min-h-[150px]" />;
  }

  if (!monthlyData?.length) {
    return (
      <div className="flex items-center justify-center h-full min-h-[150px] text-muted-foreground text-sm">
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <div className="h-full w-full p-2">
      <h4 className="text-xs font-semibold mb-2 text-muted-foreground">
        Évolution CA {selectedYear}
      </h4>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={monthlyData}>
          <defs>
            <linearGradient id="colorCA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 9 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tick={{ fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            width={35}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border p-2 rounded-lg shadow-lg text-xs">
                    <p className="font-semibold">{data.month}</p>
                    <p className="text-primary font-bold">{formatEuros(data.ca)}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area 
            type="monotone"
            dataKey="ca" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            fill="url(#colorCA)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
