import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { computeTechUniversStatsForAgency } from '@/shared/utils/technicienUniversEngine';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import { apogeeProxy } from '@/services/apogeeProxy';

interface SlideCATechniciensProps {
  currentMonthIndex: number;
}

export const SlideCATechniciens = ({ currentMonthIndex }: SlideCATechniciensProps) => {
  // Utiliser le proxy sécurisé au lieu d'appels directs
  const { data: apiData, isLoading } = useQuery({
    queryKey: ['apogee-data-techniciens'],
    queryFn: async () => {
      const [projects, interventions, factures, users] = await Promise.all([
        apogeeProxy.getProjects(),
        apogeeProxy.getInterventions(),
        apogeeProxy.getFactures(),
        apogeeProxy.getUsers(),
      ]);

      return { projects, interventions, factures, users };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading || !apiData) {
    return (
      <Card className="shadow-2xl border-2 h-full">
        <CardHeader>
          <CardTitle className="text-2xl">Évolution du CA par Technicien</CardTitle>
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
    <Card className="shadow-2xl border-2 h-full">
      <CardHeader>
        <CardTitle className="text-2xl">Évolution du CA par Technicien (6 mois)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`} />
            <Tooltip 
              formatter={(value: number) => formatEuros(value)}
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
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
