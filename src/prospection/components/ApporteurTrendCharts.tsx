/**
 * ApporteurTrendCharts - Courbes tendance CA + dossiers + taux transfo
 * Affiche les deux taux : devis→facture et dossier→facture
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart } from 'recharts';

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

  // Formater le mois en label lisible (ex: "Jan", "Fév")
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const chartData = data.map(d => ({
    ...d,
    monthLabel: (() => {
      const parts = d.month.split('-');
      const monthIdx = parseInt(parts[1], 10) - 1;
      return `${monthNames[monthIdx] || parts[1]} ${parts[0]?.slice(2)}`;
    })(),
    // Ensure null values are handled properly by recharts
    ca_ht_display: d.ca_ht || 0,
    dossiers_display: d.dossiers || 0,
  }));

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));
  const hasCA = chartData.some(d => d.ca_ht > 0);
  const hasDossiers = chartData.some(d => d.dossiers > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* CA HT mensuel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">CA HT mensuel</CardTitle>
        </CardHeader>
        <CardContent>
          {hasCA ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="monthLabel" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} className="text-xs" />
                <Tooltip
                  formatter={(v: number) => [`${fmt(v)} €`, 'CA HT']}
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar dataKey="ca_ht_display" name="CA HT" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun CA sur la période</p>
          )}
        </CardContent>
      </Card>

      {/* Dossiers + Taux transfo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dossiers & Taux transfo</CardTitle>
        </CardHeader>
        <CardContent>
          {hasDossiers ? (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="monthLabel" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} className="text-xs" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(v: number, name: string) => {
                    if (name === 'Taux transfo %') return [`${v?.toFixed(1) ?? '—'}%`, name];
                    return [v, name];
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="dossiers_display" name="Dossiers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="taux_transfo" name="Taux transfo %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun dossier sur la période</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
