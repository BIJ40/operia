import { useProfile } from '@/contexts/ProfileContext';
import { useQuery } from '@tanstack/react-query';
import { DataService } from '@/apogee-connect/services/dataService';
import { calculateUniversStats } from '@/apogee-connect/utils/universCalculations';
import { calculateTypesApporteursStats } from '@/apogee-connect/utils/typesApporteursCalculations';
import { formatEuros, formatUniverseLabel, formatApporteurType } from '@/apogee-connect/utils/formatters';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SlideUniversApporteursProps {
  currentMonthIndex: number;
}

// Palette warm dashboard
const COLORS = [
  'hsl(200, 85%, 60%)',  // warm-blue
  'hsl(145, 60%, 55%)',  // warm-green
  'hsl(35, 90%, 60%)',   // warm-orange
  'hsl(270, 60%, 65%)',  // warm-purple
  'hsl(340, 70%, 65%)',  // warm-pink
  'hsl(175, 60%, 50%)',  // warm-teal
  'hsl(200, 70%, 70%)',  // light blue
  'hsl(30, 80%, 55%)',   // peach
];

export const SlideUniversApporteurs = ({ currentMonthIndex }: SlideUniversApporteursProps) => {
  const { agence } = useProfile();

  const { data } = useQuery({
    queryKey: ['diffusion-univers-apporteurs', agence, currentMonthIndex],
    queryFn: async () => await DataService.loadAllData(true, false, agence),
    enabled: !!agence,
  });

  if (!data) return null;

  const currentDate = new Date();
  currentDate.setMonth(currentMonthIndex);
  
  const dateRange = {
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  };

  const universStats = calculateUniversStats(
    data.factures || [],
    data.projects || [],
    data.interventions || [],
    dateRange
  );

  const typesApporteurs = calculateTypesApporteursStats(
    data.factures || [],
    data.projects || [],
    data.clients || [],
    data.devis || [],
    data.users || [],
    dateRange
  );

  const universData = universStats.map(stat => ({
    name: formatUniverseLabel(stat.univers),
    value: stat.caHT,
  }));

  const apporteursData = typesApporteurs
    .filter(stat => stat.type !== 'particulier')
    .map(stat => ({
      name: formatApporteurType(stat.type),
      value: stat.nbDossiers,
    }));

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      <Card className="shadow-2xl border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Répartition par univers</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={universData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={(entry) => `${entry.name}: ${formatEuros(entry.value)}`}
              >
                {universData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatEuros(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-2xl border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Types d'apporteurs</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={apporteursData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                {apporteursData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
