import { useProfile } from '@/contexts/ProfileContext';
import { useQuery } from '@tanstack/react-query';
import { DataService } from '@/apogee-connect/services/dataService';
import { calculateTop10Apporteurs } from '@/apogee-connect/utils/apporteursCalculations';
import { formatEuros, formatPercent } from '@/apogee-connect/utils/formatters';
import { startOfYear, endOfYear } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SlideApporteursSAVProps {
  currentMonthIndex: number;
}

export const SlideApporteursSAV = ({ currentMonthIndex }: SlideApporteursSAVProps) => {
  const { agence } = useAuth();

  const { data } = useQuery({
    queryKey: ['diffusion-apporteurs-sav', agence, currentMonthIndex],
    queryFn: async () => await DataService.loadAllData(true, false, agence),
    enabled: !!agence,
  });

  if (!data) return null;

  const currentDate = new Date();
  currentDate.setMonth(currentMonthIndex);
  
  const dateRange = {
    start: startOfYear(currentDate),
    end: endOfYear(currentDate),
  };

  const topApporteurs = calculateTop10Apporteurs(
    data.factures || [],
    data.projects || [],
    data.devis || [],
    data.clients || [],
    dateRange
  ).slice(0, 5);

  const chartData = topApporteurs.map(apporteur => ({
    name: apporteur.name.substring(0, 20),
    CA: apporteur.caHT,
    'Taux Transfo': apporteur.tauxTransformation,
  }));

  return (
    <Card className="shadow-2xl border-2 h-full">
      <CardHeader>
        <CardTitle className="text-2xl">Top 5 Apporteurs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topApporteurs.map((apporteur, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <p className="font-semibold text-lg">{idx + 1}. {apporteur.name}</p>
                <p className="text-sm text-muted-foreground">
                  {apporteur.nbDossiers} dossiers • {formatPercent(apporteur.tauxTransformation)} transfo
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">{formatEuros(apporteur.caHT)}</p>
            </div>
          ))}
        </div>
        
        <div className="mt-6">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => formatEuros(value)} />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip formatter={(value: number) => formatEuros(value)} />
              <Bar dataKey="CA" fill="hsl(200, 85%, 60%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
