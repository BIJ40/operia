/**
 * ApporteurScoreCard - Jauge de scoring adaptatif + détail métriques
 */

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import type { AdaptiveScore, MetricVariation } from '../engine/adaptiveScoring';

interface Props {
  score: AdaptiveScore;
}

const LEVEL_COLORS: Record<AdaptiveScore['level'], string> = {
  danger: 'hsl(0, 72%, 51%)',
  warning: 'hsl(38, 92%, 50%)',
  stable: 'hsl(217, 91%, 60%)',
  positive: 'hsl(142, 71%, 45%)',
  excellent: 'hsl(142, 76%, 36%)',
};

const LEVEL_BG: Record<AdaptiveScore['level'], string> = {
  danger: 'bg-destructive/10 border-destructive/30',
  warning: 'bg-amber-500/10 border-amber-500/30',
  stable: 'bg-blue-500/10 border-blue-500/30',
  positive: 'bg-green-500/10 border-green-500/30',
  excellent: 'bg-emerald-500/10 border-emerald-500/30',
};

function CircularGauge({ score, color }: { score: number; color: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
      <circle
        cx="50" cy="50" r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth="8"
      />
      <circle
        cx="50" cy="50" r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - progress}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        className="transition-all duration-700"
      />
      <text
        x="50" y="46"
        textAnchor="middle"
        className="fill-foreground text-xl font-bold"
        fontSize="22"
      >
        {score}
      </text>
      <text
        x="50" y="62"
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize="10"
      >
        / 100
      </text>
    </svg>
  );
}

function VariationBadge({ pct }: { pct: number }) {
  if (Math.abs(pct) < 3) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="w-3 h-3" /> {pct > 0 ? '+' : ''}{pct}%
      </span>
    );
  }
  if (pct > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-green-600 font-medium">
        <TrendingUp className="w-3 h-3" /> +{pct}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-destructive font-medium">
      <TrendingDown className="w-3 h-3" /> {pct}%
    </span>
  );
}

function MetricRow({ label, metric, format }: { label: string; metric: MetricVariation; format?: (v: number) => string }) {
  const fmt = format || ((v: number) => String(v));
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-xs">moy. {fmt(metric.avg)}</span>
        <span className="font-medium">{fmt(metric.recent)}</span>
        <VariationBadge pct={metric.variationPct} />
      </div>
    </div>
  );
}

const euroFmt = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
const numFmt = (v: number) => v.toFixed(1);
const pctFmt = (v: number) => `${v.toFixed(0)}%`;

export function ApporteurScoreCard({ score }: Props) {
  const color = LEVEL_COLORS[score.level];

  return (
    <Card className={`border ${LEVEL_BG[score.level]}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-5">
          {/* Gauge */}
          <div className="flex flex-col items-center gap-1">
            <CircularGauge score={score.score} color={color} />
            <span className="text-sm font-semibold" style={{ color }}>
              {score.label}
            </span>
          </div>

          {/* Metrics */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-2">
              Tendance récente (3 mois) vs moyenne historique
            </p>
            <MetricRow label="CA / mois" metric={score.metrics.ca} format={euroFmt} />
            <MetricRow label="Dossiers / mois" metric={score.metrics.dossiers} format={numFmt} />
            <MetricRow label="Factures / mois" metric={score.metrics.factures} format={numFmt} />
            {score.metrics.tauxTransfo.avg !== null && score.metrics.tauxTransfo.recent !== null && (
              <MetricRow
                label="Taux transfo"
                metric={score.metrics.tauxTransfo as MetricVariation}
                format={pctFmt}
              />
            )}
          </div>
        </div>

        {/* Alerts */}
        {score.alerts.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {score.alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                <span>{alert}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
