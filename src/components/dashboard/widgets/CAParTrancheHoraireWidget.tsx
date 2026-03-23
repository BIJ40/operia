/**
 * Widget CA par Jour de la Semaine — Camembert
 * Montre la répartition du CA selon les jours de la semaine
 */

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { useDashboardPeriod } from '@/pages/DashboardStatic';
import { DataService } from '@/apogee-connect/services/dataService';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = [
  'hsl(210, 70%, 55%)',   // Lundi
  'hsl(150, 55%, 45%)',   // Mardi
  'hsl(35, 80%, 55%)',    // Mercredi
  'hsl(280, 50%, 55%)',   // Jeudi
  'hsl(350, 65%, 55%)',   // Vendredi
  'hsl(180, 50%, 45%)',   // Samedi
  'hsl(45, 70%, 50%)',    // Dimanche
];

const JOURS = [
  { key: 'lun', label: 'Lundi', dayIndex: 1 },
  { key: 'mar', label: 'Mardi', dayIndex: 2 },
  { key: 'mer', label: 'Mercredi', dayIndex: 3 },
  { key: 'jeu', label: 'Jeudi', dayIndex: 4 },
  { key: 'ven', label: 'Vendredi', dayIndex: 5 },
  { key: 'sam', label: 'Samedi', dayIndex: 6 },
  { key: 'dim', label: 'Dimanche', dayIndex: 0 },
];

export function CAParTrancheHoraireWidget() {
  const { agence } = useProfile();
  const agencySlug = agence || '';
  const { dateRange } = useDashboardPeriod();

  const { data, isLoading } = useQuery({
    queryKey: ['widget-ca-jour-semaine', agencySlug, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!agencySlug) return null;

      const apiData = await DataService.loadAllData(true, false, agencySlug);
      const factures = apiData.factures || [];

      const startTime = dateRange.start.getTime();
      const endTime = dateRange.end.getTime();

      const result = JOURS.map(j => ({ ...j, ca: 0 }));

      for (const facture of factures) {
        const dateStr = facture.date;
        if (!dateStr) continue;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) continue;
        if (d.getTime() < startTime || d.getTime() > endTime) continue;

        // Exclure avoirs (traités en négatif)
        const type = (facture.typeFacture || facture.state || '').toString().toLowerCase();
        const raw = typeof facture.totalHT === 'number' ? facture.totalHT : parseFloat(String(facture.totalHT || '0'));
        const amount = type === 'avoir' ? -Math.abs(raw) : Math.abs(raw);
        if (amount === 0) continue;

        const dayIndex = d.getDay();
        const jour = result.find(j => j.dayIndex === dayIndex);
        if (jour) jour.ca += amount;
      }

      return result.filter(j => j.ca > 0);
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <Skeleton className="h-[120px] w-full rounded-lg" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        Aucune donnée sur la période
      </div>
    );
  }

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

  // Map filtered data back to correct colors
  const getColorIndex = (key: string) => JOURS.findIndex(j => j.key === key);

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={110}>
        <PieChart>
          <Pie
            data={data}
            dataKey="ca"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={25}
            outerRadius={48}
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={COLORS[getColorIndex(entry.key)]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 mt-1">
        {data.map((j) => (
          <div key={j.key} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[getColorIndex(j.key)] }} />
            <span className="text-[10px] text-muted-foreground">{j.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
