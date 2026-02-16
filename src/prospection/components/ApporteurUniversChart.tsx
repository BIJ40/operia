/**
 * ApporteurUniversChart - Répartition CA par univers
 * Avec couleurs distinctes et tableau récapitulatif
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { UniversAggregated } from '../engine/aggregators';

interface Props {
  data: UniversAggregated[];
}

// Palette de couleurs vives et distinctes pour les univers
const UNIVERS_COLORS: Record<string, string> = {
  'Plomberie': '#3b82f6',
  'Électricité': '#f59e0b',
  'Menuiserie': '#8b5cf6',
  'Vitrerie': '#06b6d4',
  'Peinture': '#ec4899',
  'Serrurerie': '#6366f1',
  'Chauffage': '#ef4444',
  'Climatisation': '#14b8a6',
  'Rénovation': '#f97316',
  'Multiservice': '#84cc16',
  'Non classé': '#94a3b8',
};

const FALLBACK_COLORS = [
  '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899',
  '#6366f1', '#ef4444', '#14b8a6', '#f97316', '#84cc16',
];

function getUniversColor(code: string, index: number): string {
  return UNIVERS_COLORS[code] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

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
  const chartData = data.map((d, i) => ({
    ...d,
    name: d.univers_code,
    value: d.ca_ht,
    color: getUniversColor(d.univers_code, i),
    pct: total > 0 ? Math.round((d.ca_ht / total) * 100) : 0,
  }));

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Mix univers</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Pie chart */}
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              dataKey="value"
              paddingAngle={2}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${fmt(value)} €`, 'CA HT']}
              contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Légende tableau */}
        <div className="mt-3 space-y-1.5">
          {chartData.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                <span className="truncate text-foreground">{d.univers_code}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-muted-foreground">{d.dossiers} dossier{d.dossiers > 1 ? 's' : ''}</span>
                <span className="font-medium text-foreground">{fmt(d.ca_ht)} €</span>
                <span className="text-xs text-muted-foreground w-8 text-right">{d.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
