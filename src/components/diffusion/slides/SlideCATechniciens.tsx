import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { computeTechUniversStatsForAgency } from '@/shared/utils/technicienUniversEngine';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import { useProfile } from '@/contexts/ProfileContext';
import { DataService } from '@/apogee-connect/services/dataService';

interface SlideCATechniciensProps {
  currentMonthIndex: number;
}

export const SlideCATechniciens = ({ currentMonthIndex }: SlideCATechniciensProps) => {
  const { agence } = useAuth();
  
  const { data: apiData, isLoading } = useQuery({
    queryKey: ['diffusion-ca-techniciens', agence, currentMonthIndex],
    queryFn: async () => await DataService.loadAllData(true, false, agence),
    enabled: !!agence,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !apiData) {
    return (
      <Card className="rounded-xl border border-helpconfort-blue/15 border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/10 via-background to-background shadow-sm h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Évolution du CA par Technicien</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement des données...</p>
        </CardContent>
      </Card>
    );
  }

  // Calculer les données pour les 6 derniers mois
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    months.push(subMonths(now, i));
  }

  // Calculer CA par technicien pour chaque mois
  const techniciensByMonth = months.map(month => {
    const dateRange = {
      start: startOfMonth(month),
      end: endOfMonth(month)
    };

    const stats = computeTechUniversStatsForAgency(
      apiData.factures,
      apiData.projects,
      apiData.interventions,
      apiData.users,
      dateRange
    );

    return {
      month: format(month, 'MMM', { locale: fr }),
      stats
    };
  });

  // Identifier les 8 meilleurs techniciens (par CA total sur 6 mois)
  const techTotals: { [id: string]: { nom: string; total: number; color: string } } = {};
  
  techniciensByMonth.forEach(({ stats }) => {
    stats.forEach(tech => {
      if (!techTotals[tech.technicienId]) {
        techTotals[tech.technicienId] = {
          nom: tech.technicienNom,
          total: 0,
          color: tech.technicienColor
        };
      }
      techTotals[tech.technicienId].total += tech.totaux.caHT;
    });
  });

  const topTechs = Object.entries(techTotals)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 8)
    .map(([id]) => id);

  // Construire les données pour le graphique
  const chartData = techniciensByMonth.map(({ month, stats }) => {
    const dataPoint: any = { month };
    
    topTechs.forEach(techId => {
      const tech = stats.find(t => t.technicienId === techId);
      dataPoint[techTotals[techId].nom] = tech ? Math.round(tech.totaux.caHT) : 0;
    });

    return dataPoint;
  });

  return (
    <Card className="rounded-xl border border-helpconfort-blue/15 border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/10 via-background to-background shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-foreground">Évolution du CA par Technicien (6 mois)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`} className="text-xs" />
            <Tooltip 
              formatter={(value: number) => formatEuros(value)}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            {topTechs.map(techId => (
              <Bar
                key={techId}
                dataKey={techTotals[techId].nom}
                fill={techTotals[techId].color}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
