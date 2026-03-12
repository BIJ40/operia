/**
 * Widget Indicateurs Globaux - Version avec sélecteur de période du dashboard
 */

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { Card } from '@/components/ui/card';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { DataService } from '@/apogee-connect/services/dataService';
import { computeStat } from '@/statia/engine/computeStat';
import { calculateMonthlyCA } from '@/apogee-connect/utils/monthlyCalculations';
import { LoadedData, StatParams } from '@/statia/definitions/types';
import { supabase } from '@/integrations/supabase/client';
import { loadSAVOverridesByAgencyUuid } from '@/statia/services/savOverridesService';
import { useDashboardPeriod } from '@/pages/DashboardStatic';
import { ACCENT_THEMES, type AccentThemeKey } from '@/lib/accentThemes';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Configuration des KPIs à afficher (sans SAV)
const KPI_CONFIG: Array<{ 
  id: string; 
  statId: string;
  label: string; 
  format: 'currency' | 'percent' | 'number' | 'days'; 
  accent: AccentThemeKey;
  icon: string;
  tooltip: string;
  getValue: (result: any) => number | null;
}> = [
  { 
    id: 'ca', 
    statId: 'ca_global_ht',
    label: 'CA période', 
    format: 'currency', 
    accent: 'blue',
    icon: '€',
    tooltip: 'Chiffre d\'affaires HT total sur la période sélectionnée (somme des factures)',
    getValue: (r) => r?.value ?? null
  },
  { 
    id: 'transfo', 
    statId: 'taux_transformation_devis_nombre',
    label: 'Taux transfo', 
    format: 'percent', 
    accent: 'green',
    icon: '📈',
    tooltip: 'Pourcentage de devis transformés en factures (nb factures / nb devis × 100)',
    getValue: (r) => r?.value ?? null
  },
  { 
    id: 'panier', 
    statId: 'panier_moyen',
    label: 'Panier moyen', 
    format: 'currency', 
    accent: 'pink',
    icon: '🛒',
    tooltip: 'Montant moyen HT par dossier facturé (CA HT / nb factures)',
    getValue: (r) => r?.value ?? null
  },
  { 
    id: 'dossiers', 
    statId: 'nb_dossiers_crees',
    label: 'Dossiers', 
    format: 'number', 
    accent: 'purple',
    icon: '📁',
    tooltip: 'Nombre de dossiers créés sur la période',
    getValue: (r) => r?.value ?? null
  },
  { 
    id: 'devis', 
    statId: 'nombre_devis',
    label: 'Devis émis', 
    format: 'number', 
    accent: 'orange',
    icon: '📄',
    tooltip: 'Nombre total de devis émis sur la période',
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
  const { agence } = useProfile();
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
      <div className="space-y-3">
        <div className="grid grid-cols-5 gap-2">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* KPIs en ligne - 5 colonnes */}
      <div className="grid grid-cols-5 gap-2">
        {KPI_CONFIG.map((kpi) => {
          const value = kpiData?.[kpi.id] as number | null;
          const accent = ACCENT_THEMES[kpi.accent];
          const formatted = formatValue(value, kpi.format);
          
          return (
            <Tooltip key={kpi.id} delayDuration={0}>
              <TooltipTrigger asChild>
                <div 
                  className="bg-card/60 backdrop-blur-sm rounded-xl p-3 border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all cursor-default"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-primary-foreground text-xs font-bold shadow-sm ${accent.solidBg}`}>
                      {kpi.icon}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium truncate">{kpi.label}</span>
                  </div>
                  <p className={`text-lg font-bold ${accent.text} truncate`}>{formatted}</p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-popover border border-border shadow-lg">
                <div className="text-sm font-semibold">{kpi.label}</div>
                <div className={`text-lg font-bold ${accent.text}`}>{formatted}</div>
              </TooltipContent>
            </Tooltip>
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
               <RechartsTooltip 
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
