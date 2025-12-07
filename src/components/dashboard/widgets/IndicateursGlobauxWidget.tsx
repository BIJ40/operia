/**
 * Widget Indicateurs Globaux - Affiche tous les KPIs de /hc-agency/indicateurs
 * + graphique Evolution du CA
 */

import { useStatiaIndicateurs } from '@/statia/hooks/useStatiaIndicateurs';
import { Card } from '@/components/ui/card';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { DataService } from '@/apogee-connect/services/dataService';
import { useApiToggle } from '@/apogee-connect/contexts/ApiToggleContext';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { calculateMonthlyCA } from '@/apogee-connect/utils/monthlyCalculations';

// Configuration des KPIs à afficher
const KPI_CONFIG: Array<{ key: string; label: string; format: string; color: string; icon: string; valueKey?: string }> = [
  { key: 'caJour', label: 'CA période', format: 'currency', color: 'from-orange-500 to-orange-600', icon: '€' },
  { key: 'tauxSAVGlobal', label: 'Taux SAV', format: 'percent', color: 'from-red-500 to-red-600', icon: 'SAV' },
  { key: 'tauxTransformationDevis', label: 'Taux transfo', format: 'percent', valueKey: 'tauxTransformation', color: 'from-cyan-500 to-cyan-600', icon: '📈' },
  { key: 'panierMoyen', label: 'Panier moyen', format: 'currency', valueKey: 'panierMoyen', color: 'from-pink-500 to-pink-600', icon: '🛒' },
  { key: 'dossiersJour', label: 'Dossiers', format: 'number', color: 'from-blue-500 to-blue-600', icon: '📁' },
  { key: 'devisJour', label: 'Devis émis', format: 'number', color: 'from-purple-500 to-purple-600', icon: '📄' },
  { key: 'delaiDossierFacture', label: 'Délai moyen', format: 'days', valueKey: 'delaiMoyen', color: 'from-teal-500 to-teal-600', icon: '⏱️' },
  { key: 'delaiDossierPremierDevis', label: 'Délai 1er devis', format: 'days', valueKey: 'delaiMoyen', color: 'from-sky-500 to-sky-600', icon: '📝' },
];

function formatValue(value: number | null | undefined, format: string): string {
  if (value === null || value === undefined) return '–';
  
  switch (format) {
    case 'currency':
      return formatEuros(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'days':
      return `${value}j`;
    case 'number':
    default:
      return value.toLocaleString('fr-FR');
  }
}

export function IndicateursGlobauxWidget() {
  const selectedYear = new Date().getFullYear();
  const { data: statiaData, isLoading } = useStatiaIndicateurs(selectedYear);
  const { isApiEnabled } = useApiToggle();
  const { currentAgency, isAgencyReady } = useAgency();
  
  // Données pour le graphique mensuel
  const { data: monthlyData } = useQuery({
    queryKey: ['monthly-ca-widget', isApiEnabled, currentAgency?.id, selectedYear],
    enabled: isAgencyReady && isApiEnabled,
    queryFn: async () => {
      if (!currentAgency?.id) return null;
      const apiData = await DataService.loadAllData(isApiEnabled);
      return calculateMonthlyCA(
        apiData.factures || [],
        apiData.clients || [],
        apiData.projects || [],
        selectedYear,
        currentAgency.id
      );
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-2">
        <div className="grid grid-cols-4 gap-2">
          {Array(8).fill(0).map((_, i) => (
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {KPI_CONFIG.map((kpi) => {
          const rawValue = statiaData?.[kpi.key as keyof typeof statiaData];
          const value = kpi.valueKey && typeof rawValue === 'object' && rawValue !== null
            ? (rawValue as Record<string, number>)[kpi.valueKey]
            : typeof rawValue === 'number' 
              ? rawValue 
              : null;
          
          return (
            <Card key={kpi.key} className="p-2 border hover:border-primary/50 transition-colors">
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
                        <p className="text-muted-foreground">{data.nbFactures} factures</p>
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
