/**
 * FinancialChartsSection — Donut, Aging Balance, Top Debtors
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import type { FinancialAnalysis, AgingBreakdown, FinancialEntityStats } from '@/apogee-connect/types/financial';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const COLORS_ENTITY = ['hsl(var(--primary))', 'hsl(221, 83%, 53%)', 'hsl(var(--muted-foreground))'];
const COLORS_AGING = ['hsl(142, 76%, 36%)', 'hsl(45, 93%, 47%)', 'hsl(25, 95%, 53%)', 'hsl(0, 72%, 51%)'];
const AGING_LABELS: Record<string, string> = { '0_30': '0–30 j', '31_60': '31–60 j', '61_90': '61–90 j', '90_plus': '90+ j' };

function ChartSkeleton() {
  return <Skeleton className="w-full h-[220px] rounded-md" />;
}

// ─── Donut: Répartition des dus ────────────────────────

function DuRepartitionChart({ kpis }: { kpis: FinancialAnalysis['kpis'] }) {
  const data = [
    { name: 'Clients directs', value: Math.max(0, kpis.duClientsDirects) },
    { name: 'Apporteurs', value: Math.max(0, kpis.duApporteurs) },
    { name: 'Non classé', value: Math.max(0, kpis.duUnknown) },
  ].filter(d => d.value > 0);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-12">Aucun encours</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3} stroke="none">
          {data.map((_, i) => <Cell key={i} fill={COLORS_ENTITY[i % COLORS_ENTITY.length]} />)}
        </Pie>
        <Tooltip formatter={(v: number) => formatEuros(v)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Aging Balance ─────────────────────────────────────

function AgingBalanceChart({ aging }: { aging: AgingBreakdown }) {
  const data = Object.entries(aging).map(([key, val], i) => ({
    name: AGING_LABELS[key] || key,
    value: Math.round(val),
    fill: COLORS_AGING[i],
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number) => formatEuros(v)} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Top Debtors Mini-list ─────────────────────────────

function TopDebtorsList({ entities, title, limit = 5 }: { entities: FinancialEntityStats[]; title: string; limit?: number }) {
  const top = entities.filter(e => e.resteDu > 0).slice(0, limit);

  if (top.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">Aucun encours</p>;
  }

  const maxDu = Math.max(...top.map(e => e.resteDu));

  return (
    <div className="space-y-2.5">
      {top.map((e, i) => (
        <div key={e.entityId} className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">#{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{e.entityLabel}</p>
            <div className="w-full h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all',
                  e.riskLevel === 'critical' ? 'bg-destructive' :
                  e.riskLevel === 'warning' ? 'bg-amber-500' :
                  'bg-primary'
                )}
                style={{ width: `${Math.max(4, (e.resteDu / maxDu) * 100)}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-semibold tabular-nums shrink-0">{formatEuros(e.resteDu)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Section ──────────────────────────────────────

interface FinancialChartsSectionProps {
  analysis: FinancialAnalysis | null;
  isLoading: boolean;
}

export function FinancialChartsSection({ analysis, isLoading }: FinancialChartsSectionProps) {
  if (isLoading || !analysis) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4"><ChartSkeleton /></Card>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Répartition des dus</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <DuRepartitionChart kpis={analysis.kpis} />
          <div className="flex flex-wrap gap-3 justify-center mt-1">
            {[
              { label: 'Clients', color: COLORS_ENTITY[0] },
              { label: 'Apporteurs', color: COLORS_ENTITY[1] },
              { label: 'Non classé', color: COLORS_ENTITY[2] },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                <span className="text-[11px] text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Aging Balance</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <AgingBalanceChart aging={analysis.aging} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Top apporteurs (dû)</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <TopDebtorsList entities={analysis.byApporteur} title="Top apporteurs" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Top clients (dû)</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <TopDebtorsList entities={analysis.byClient} title="Top clients" />
        </CardContent>
      </Card>
    </motion.div>
  );
}
