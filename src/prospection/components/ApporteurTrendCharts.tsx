/**
 * ApporteurTrendCharts - Courbes tendance CA + dossiers + taux transfo
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface MonthlyData {
  month: string;
  dossiers: number;
  ca_ht: number;
  taux_transfo: number | null;
}

interface Props {
  data: MonthlyData[];
}

export function ApporteurTrendCharts({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tendances mensuelles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée disponible</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(d => ({
    ...d,
    monthLabel: d.month.slice(5), // MM
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* CA HT */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">CA HT mensuel</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="monthLabel" className="text-xs" />
              <YAxis tickFormatter={v => `${Math.round(v / 1000)}k`} className="text-xs" />
              <Tooltip
                formatter={(v: number) => [`${new Intl.NumberFormat('fr-FR').format(Math.round(v))}€`, 'CA HT']}
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
              />
              <Line type="monotone" dataKey="ca_ht" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Dossiers + Taux transfo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dossiers & Taux transfo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="monthLabel" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" />
              <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} className="text-xs" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="dossiers" name="Dossiers" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="taux_transfo" name="Taux transfo %" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
