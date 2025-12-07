/**
 * Widget Indicateurs Globaux - Version autonome sans dépendance FiltersProvider
 * Affiche les KPIs clés + graphique Evolution du CA
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getMetricForAgency } from '@/statia/api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

// Configuration des KPIs à afficher
const KPI_CONFIG: Array<{ id: string; label: string; format: 'currency' | 'percent' | 'number' | 'days'; color: string; icon: string }> = [
  { id: 'ca_global_ht', label: 'CA période', format: 'currency', color: 'from-orange-500 to-orange-600', icon: '€' },
  { id: 'taux_sav_global', label: 'Taux SAV', format: 'percent', color: 'from-red-500 to-red-600', icon: 'SAV' },
  { id: 'taux_transformation_devis_nombre', label: 'Taux transfo', format: 'percent', color: 'from-cyan-500 to-cyan-600', icon: '📈' },
  { id: 'panier_moyen', label: 'Panier moyen', format: 'currency', color: 'from-pink-500 to-pink-600', icon: '🛒' },
  { id: 'nb_dossiers_crees', label: 'Dossiers', format: 'number', color: 'from-blue-500 to-blue-600', icon: '📁' },
  { id: 'nombre_devis', label: 'Devis émis', format: 'number', color: 'from-purple-500 to-purple-600', icon: '📄' },
];

function formatValue(value: number | null | undefined, format: string): string {
  if (value === null || value === undefined) return '–';
  
  switch (format) {
    case 'currency':
      return formatEuros(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'days':
      return `${Math.round(value)}j`;
    case 'number':
    default:
      return value.toLocaleString('fr-FR');
  }
}

export function IndicateursGlobauxWidget() {
  const { agence } = useAuth();
  const agencySlug = agence || '';
  const selectedYear = new Date().getFullYear();

  const now = new Date();
  const monthDateRange = {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
  
  const yearDateRange = {
    start: startOfYear(now),
    end: endOfYear(now),
  };

  const services = getGlobalApogeeDataServices();

  // Fetch tous les KPIs en parallèle
  const { data: kpiData, isLoading } = useQuery({
    queryKey: ['widget-indicateurs-globaux', agencySlug, monthDateRange.start.toISOString()],
    queryFn: async () => {
      if (!agencySlug) return null;

      const results = await Promise.all(
        KPI_CONFIG.map(async (kpi) => {
          try {
            const result = await getMetricForAgency(kpi.id, agencySlug, { dateRange: monthDateRange }, services);
            return { id: kpi.id, value: result?.value ?? null };
          } catch {
            return { id: kpi.id, value: null };
          }
        })
      );

      return Object.fromEntries(results.map(r => [r.id, r.value]));
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch CA mensuel pour le graphique
  const { data: monthlyData } = useQuery({
    queryKey: ['widget-ca-mensuel', agencySlug, selectedYear],
    queryFn: async () => {
      if (!agencySlug) return null;
      
      try {
        const result = await getMetricForAgency('ca_mensuel', agencySlug, { dateRange: yearDateRange }, services);
        if (result && Array.isArray(result.value)) {
          return result.value;
        }
        // Si le résultat est un objet avec les mois
        if (result && typeof result === 'object') {
          const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
          const resultObj = result as unknown as Record<string, unknown>;
          return months.map((month, index) => ({
            month,
            ca: Number(resultObj[String(index + 1)]) || 0,
          }));
        }
        return null;
      } catch {
        return null;
      }
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-2">
        <div className="grid grid-cols-3 gap-2">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs en grille */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {KPI_CONFIG.map((kpi) => {
          const value = kpiData?.[kpi.id] as number | null;
          
          return (
            <Card key={kpi.id} className="p-2 border hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-1.5 mb-1">
                <div className={`bg-gradient-to-br ${kpi.color} p-1 rounded text-[10px] text-white font-bold flex items-center justify-center w-5 h-5`}>
                  {kpi.icon}
                </div>
                <span className="text-[10px] text-muted-foreground truncate">{kpi.label}</span>
              </div>
              <p className="text-sm font-bold truncate">{formatValue(value, kpi.format)}</p>
            </Card>
          );
        })}
      </div>

      {/* Graphique Evolution CA */}
      {monthlyData && monthlyData.length > 0 && (
        <Card className="p-3">
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Évolution du CA {selectedYear}</h4>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 9 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 9 }}
                tickLine={false}
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
              <Bar 
                dataKey="ca" 
                fill="hsl(var(--primary))" 
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
