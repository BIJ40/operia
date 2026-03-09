/**
 * RapportTabContent — Rapport d'activité V2
 * Charts 12 mois + KPIs récap
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Download } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useApporteurKpis } from '../../hooks/useApporteurKpis';
import { PeriodSelector } from '../cockpit/PeriodSelector';
import { formatCurrency } from '@/lib/formatters';
import type { ApporteurStatsV2Request } from '../../types/apporteur-stats-v2';

const MONTH_LABELS: Record<string, string> = {};
function shortMonth(ym: string) {
  if (MONTH_LABELS[ym]) return MONTH_LABELS[ym];
  try {
    const [y, m] = ym.split('-');
    const d = new Date(Number(y), Number(m) - 1);
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    MONTH_LABELS[ym] = label;
    return label;
  } catch {
    return ym;
  }
}

export default function RapportTabContent() {
  const [period, setPeriod] = useState<ApporteurStatsV2Request['period']>('year');
  const { data, isLoading, error } = useApporteurKpis({ period });
  const stats = data?.data;
  const series = stats?.series_12m;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-4 sm:p-6">
        <Card className="border-[hsl(var(--ap-warning)/.4)] bg-[hsl(var(--ap-warning-light))] rounded-2xl">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[hsl(var(--ap-warning))]" />
              <p className="text-foreground">
                {data?.error || 'Erreur de chargement du rapport.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartStyle = {
    borderRadius: '12px',
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--card))',
    fontSize: '11px',
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rapport d'activité</h1>
          <p className="text-muted-foreground text-sm">
            Période : {stats.period.from} → {stats.period.to}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSelector value={period} onChange={setPeriod} />
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" disabled>
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* KPIs Summary */}
      {stats.kpis && (
        <Card className="rounded-2xl">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Synthèse période
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">CA généré</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(stats.kpis.ca_genere)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dossiers en cours</p>
                <p className="text-lg font-bold text-foreground">{stats.kpis.dossiers_en_cours}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taux transformation</p>
                <p className="text-lg font-bold text-foreground">{stats.kpis.taux_transformation.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Panier moyen</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(stats.kpis.panier_moyen)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {series && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* CA HT */}
          {series.ca_ht && series.ca_ht.length > 0 && (
            <Card className="rounded-2xl">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
                  CA HT mensuel
                </p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series.ca_ht as any[]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={chartStyle} formatter={(v: number) => [formatCurrency(v), 'CA HT']} labelFormatter={shortMonth} />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dossiers */}
          {series.dossiers && series.dossiers.length > 0 && (
            <Card className="rounded-2xl">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
                  Volume dossiers / mois
                </p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series.dossiers as any[]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={chartStyle} formatter={(v: number) => [v, 'Dossiers']} labelFormatter={shortMonth} />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Taux transformation */}
          {series.taux_transformation && series.taux_transformation.length > 0 && (
            <Card className="rounded-2xl">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
                  Taux de transformation
                </p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series.taux_transformation as any[]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip contentStyle={chartStyle} formatter={(v: number) => [`${v.toFixed(1)}%`, 'Taux']} labelFormatter={shortMonth} />
                      <Line type="monotone" dataKey="value" stroke="hsl(280, 60%, 55%)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Délais */}
          {series.avg_delays_days && series.avg_delays_days.length > 0 && (
            <Card className="rounded-2xl">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
                  Délais moyens (jours)
                </p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series.avg_delays_days as any[]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={chartStyle} labelFormatter={shortMonth} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="rdv" name="RDV" stroke="hsl(200, 70%, 50%)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="devis_validation" name="Validation devis" stroke="hsl(35, 90%, 55%)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="paiement" name="Paiement" stroke="hsl(0, 70%, 55%)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
