import { useProfile } from '@/contexts/ProfileContext';
import { useQuery } from '@tanstack/react-query';
import { DataService } from '@/apogee-connect/services/dataService';
import { calculateMonthlySegmentation } from '@/apogee-connect/utils/segmentationCalculations';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SlideSegmentationProps {
  currentMonthIndex: number;
}

export const SlideSegmentation = ({ currentMonthIndex }: SlideSegmentationProps) => {
  const { agence } = useAuth();

  const { data } = useQuery({
    queryKey: ['diffusion-segmentation', agence, currentMonthIndex],
    queryFn: async () => await DataService.loadAllData(true, false, agence),
    enabled: !!agence,
  });

  if (!data) return null;

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  const segmentation = calculateMonthlySegmentation(
    data.factures || [],
    data.clients || [],
    data.projects || [],
    currentYear
  );

  const chartData = segmentation.map(seg => ({
    name: seg.month,
    Particuliers: seg.caParticuliers,
    Apporteurs: seg.caApporteurs,
  }));

  return (
    <Card className="shadow-2xl border-2 h-full">
      <CardHeader>
        <CardTitle className="text-2xl">Segmentation Particuliers vs Apporteurs</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => formatEuros(value)} />
            <Tooltip formatter={(value: number) => formatEuros(value)} />
            <Legend />
            <Bar dataKey="Particuliers" fill="hsl(200, 85%, 60%)" stackId="a" />
            <Bar dataKey="Apporteurs" fill="hsl(145, 60%, 55%)" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
