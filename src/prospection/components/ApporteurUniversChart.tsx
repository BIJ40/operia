/**
 * ApporteurUniversChart - Répartition CA par univers (bar chart)
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { UniversAggregated } from '../engine/aggregators';

interface Props {
  data: UniversAggregated[];
}

const COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))',
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6',
];

export function ApporteurUniversChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mix univers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée univers disponible</p>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((s, d) => s + d.ca_ht, 0);
  const chartData = data.map(d => ({
    ...d,
    pct: total > 0 ? Math.round((d.ca_ht / total) * 100) : 0,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Mix univers (CA HT)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis type="number" tickFormatter={v => `${Math.round(v)}€`} className="text-xs" />
            <YAxis type="category" dataKey="univers_code" width={75} className="text-xs" />
            <Tooltip
              formatter={(value: number) => [`${new Intl.NumberFormat('fr-FR').format(Math.round(value))}€`, 'CA HT']}
              contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
            />
            <Bar dataKey="ca_ht" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
