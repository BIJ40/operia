/**
 * Widget Indicateurs Globaux - Version avec sélecteur de période du dashboard
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DataService } from '@/apogee-connect/services/dataService';
import { computeStat } from '@/statia/engine/computeStat';
import { calculateMonthlyCA } from '@/apogee-connect/utils/monthlyCalculations';
import { LoadedData, StatParams } from '@/statia/definitions/types';
import { supabase } from '@/integrations/supabase/client';
import { loadSAVOverridesByAgencyUuid } from '@/statia/services/savOverridesService';
import { useDashboardPeriod } from '@/pages/DashboardStatic';

// Configuration des KPIs à afficher
const KPI_CONFIG: Array<{ 
  id: string; 
  statId: string;
  label: string; 
  format: 'currency' | 'percent' | 'number' | 'days'; 
  color: string; 
  icon: string;
  getValue: (result: any) => number | null;
}> = [
  { 
    id: 'ca', 
    statId: 'ca_global_ht',
    label: 'CA période', 
    format: 'currency', 
    color: 'from-orange-500 to-orange-600', 
    icon: '€',
    getValue: (r) => r?.value ?? null
  },
  { 
    id: 'transfo', 
    statId: 'taux_transformation_devis_nombre',
    label: 'Taux transfo', 
    format: 'percent', 
    color: 'from-cyan-500 to-cyan-600', 
    icon: '📈',
    getValue: (r) => r?.value ?? null
  },
  { 
    id: 'sav', 
    statId: 'taux_sav_global',
    label: 'Taux SAV', 
    format: 'percent', 
    color: 'from-red-500 to-red-600', 
    icon: 'SAV',
    getValue: (r) => r?.value ?? null
  },
  { 
    id: 'panier', 
    statId: 'panier_moyen',
    label: 'Panier moyen', 
    format: 'currency', 
    color: 'from-pink-500 to-pink-600', 
    icon: '🛒',
    getValue: (r) => r?.value ?? null
  },
  { 
    id: 'dossiers', 
    statId: 'nb_dossiers_crees',
    label: 'Dossiers', 
    format: 'number', 
    color: 'from-blue-500 to-blue-600', 
    icon: '📁',
    getValue: (r) => r?.value ?? null
  },
  { 
    id: 'devis', 
    statId: 'nombre_devis',
    label: 'Devis émis', 
    format: 'number', 
    color: 'from-purple-500 to-purple-600', 
    icon: '📄',
    getValue: (r) => r?.value ?? null
  },
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

  // Utiliser la période du dashboard parent
  const { dateRange } = useDashboardPeriod();

  // Fetch tous les KPIs
  const { data: kpiData, isLoading } = useQuery({
    queryKey: ['widget-indicateurs-globaux-v5', agencySlug, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!agencySlug) return null;

      const apiData = await DataService.loadAllData(true, false, agencySlug);
      
      const loadedData: LoadedData = {
        factures: apiData.factures || [],
        devis: apiData.devis || [],
        interventions: apiData.interventions || [],
        projects: apiData.projects || [],
        users: apiData.users || [],
        clients: apiData.clients || [],
      };

      // Charger les overrides SAV pour le calcul correct du taux SAV
      let savOverridesMap: Map<number, { is_confirmed_sav: boolean | null; cout_sav_manuel: number | null; techniciens_override: number[] | null }> | undefined;
      
      try {
        const { data: agencyData } = await supabase
          .from("apogee_agencies")
          .select("id")
          .eq("slug", agencySlug)
          .single();
        
        if (agencyData?.id) {
          const overridesData = await loadSAVOverridesByAgencyUuid(agencyData.id);
          savOverridesMap = new Map();
          for (const o of overridesData.overrides) {
            savOverridesMap.set(o.project_id, {
              is_confirmed_sav: o.is_confirmed_sav,
              cout_sav_manuel: o.cout_sav_manuel,
              techniciens_override: o.techniciens_override,
            });
          }
        }
      } catch (error) {
        console.warn('[Widget] Impossible de charger les overrides SAV:', error);
      }

      const params: StatParams = {
        dateRange,
        agencySlug,
        savOverrides: savOverridesMap,
      };

      const services = {
        getFactures: async () => loadedData.factures,
        getDevis: async () => loadedData.devis,
        getInterventions: async () => loadedData.interventions,
        getProjects: async () => loadedData.projects,
        getUsers: async () => loadedData.users,
        getClients: async () => loadedData.clients,
      };

      const results: Record<string, any> = {};
      
      for (const kpi of KPI_CONFIG) {
        try {
          const result = await computeStat(kpi.statId, params, services, { useCache: false });
          results[kpi.id] = kpi.getValue(result);
        } catch (error) {
          console.error(`[Widget] Erreur calcul ${kpi.statId}:`, error);
          results[kpi.id] = null;
        }
      }

      return results;
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch CA mensuel pour le graphique
  const { data: monthlyData } = useQuery({
    queryKey: ['widget-ca-mensuel-v4', agencySlug, selectedYear],
    queryFn: async () => {
      if (!agencySlug) return null;
      
      try {
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
      } catch (error) {
        console.error('[Widget] Erreur calcul CA mensuel:', error);
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
