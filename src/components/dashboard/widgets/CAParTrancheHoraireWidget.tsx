/**
 * Widget CA par Tranche Horaire — Camembert simple
 */

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { useDashboardPeriod } from '@/pages/DashboardStatic';
import { DataService } from '@/apogee-connect/services/dataService';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = [
  'hsl(210, 70%, 55%)',  // Matin
  'hsl(150, 55%, 45%)',  // Midi
  'hsl(35, 80%, 55%)',   // Après-midi
  'hsl(280, 50%, 55%)',  // Soir
];

const TRANCHES = [
  { key: 'matin', label: 'Matin', min: 6, max: 12 },
  { key: 'midi', label: '12h-14h', min: 12, max: 14 },
  { key: 'aprem', label: 'Après-midi', min: 14, max: 18 },
  { key: 'soir', label: 'Après 18h', min: 18, max: 24 },
];

export function CAParTrancheHoraireWidget() {
  const { agence } = useProfile();
  const agencySlug = agence || '';
  const { dateRange } = useDashboardPeriod();

  const { data, isLoading } = useQuery({
    queryKey: ['widget-ca-tranche-horaire', agencySlug, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!agencySlug) return null;

      const apiData = await DataService.loadAllData(true, false, agencySlug);
      const factures = apiData.factures || [];

      const startTime = dateRange.start.getTime();
      const endTime = dateRange.end.getTime();

      const result = TRANCHES.map(t => ({ ...t, ca: 0 }));

      for (const facture of factures) {
        const dateStr = facture.date;
        if (!dateStr) continue;
        const d = new Date(dateStr);
        if (d.getTime() < startTime || d.getTime() > endTime) continue;

        const amount = Math.abs(typeof facture.totalHT === 'number' ? facture.totalHT : parseFloat(String(facture.totalHT || '0')));
        if (amount === 0) continue;

        const hour = d.getHours();
        for (const tranche of result) {
          if (hour >= tranche.min && hour < tranche.max) {
            tranche.ca += amount;
            break;
          }
        }
      }

      return result.filter(t => t.ca > 0);
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
        Aucune donnée
      </div>
    );
  }

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

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
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 mt-1">
        {data.map((t, i) => (
          <div key={t.key} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-[10px] text-muted-foreground">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
