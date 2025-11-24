import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SatisfactionChartProps {
  tickets: Array<{
    created_at: string;
    rating: number | null;
    resolved_at: string | null;
  }>;
  period?: 'week' | 'month';
}

export function SatisfactionChart({ tickets, period = 'week' }: SatisfactionChartProps) {
  const days = period === 'week' ? 7 : 30;
  
  // Créer les données pour le graphique
  const chartData = Array.from({ length: days }, (_, i) => {
    const date = subDays(startOfDay(new Date()), days - 1 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Filtrer les tickets résolus ce jour avec une note
    const dayTickets = tickets.filter(t => {
      if (!t.resolved_at || !t.rating) return false;
      const resolvedDate = format(new Date(t.resolved_at), 'yyyy-MM-dd');
      return resolvedDate === dateStr;
    });
    
    const avgRating = dayTickets.length > 0
      ? dayTickets.reduce((sum, t) => sum + (t.rating || 0), 0) / dayTickets.length
      : null;
    
    return {
      date: format(date, 'd MMM', { locale: fr }),
      fullDate: date,
      rating: avgRating,
      count: dayTickets.length,
    };
  });

  // Calculer la tendance
  const recentData = chartData.filter(d => d.rating !== null).slice(-7);
  const olderData = chartData.filter(d => d.rating !== null).slice(0, -7);
  
  const recentAvg = recentData.length > 0
    ? recentData.reduce((sum, d) => sum + (d.rating || 0), 0) / recentData.length
    : 0;
  const olderAvg = olderData.length > 0
    ? olderData.reduce((sum, d) => sum + (d.rating || 0), 0) / olderData.length
    : 0;
  
  const trend = recentAvg - olderAvg;
  const trendPercent = olderAvg > 0 ? ((trend / olderAvg) * 100).toFixed(1) : 0;

  const TrendIcon = trend > 0.1 ? TrendingUp : trend < -0.1 ? TrendingDown : Minus;
  const trendColor = trend > 0.1 ? 'text-green-500' : trend < -0.1 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Évolution de la satisfaction</CardTitle>
            <CardDescription>
              Notes moyennes sur {period === 'week' ? '7 jours' : '30 jours'}
            </CardDescription>
          </div>
          <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span>{Math.abs(parseFloat(trendPercent as string))}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              domain={[0, 5]}
              ticks={[0, 1, 2, 3, 4, 5]}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={(value: any, name: string, props: any) => {
                if (value === null) return ['Aucune note', 'Note'];
                return [
                  <span key="value">
                    {value.toFixed(1)}/5 ({props.payload.count} évaluation{props.payload.count > 1 ? 's' : ''})
                  </span>,
                  'Note moyenne'
                ];
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Area
              type="monotone"
              dataKey="rating"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorRating)"
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
