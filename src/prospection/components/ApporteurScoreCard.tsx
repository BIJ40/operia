/**
 * ApporteurScoreCard - Jauge de scoring adaptatif + détail métriques
 * Toggle "dernier mois" vs "3 derniers mois" pour la comparaison
 */

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, HelpCircle } from 'lucide-react';
import { computeAdaptiveScore, type AdaptiveScore, type MetricVariation, type MonthlyTrendEntry, type RecentMonthsOption } from '../engine/adaptiveScoring';

interface Props {
  score: AdaptiveScore;
  monthlyTrendFull: MonthlyTrendEntry[];
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

const METRIC_TOOLTIPS: Record<string, string> = {
  ca: 'Moyenne mensuelle du chiffre d\'affaires HT facturé. Comparaison entre la période récente et la moyenne sur tout l\'historique connu.',
  dossiers: 'Nombre moyen de dossiers confiés par mois. Comparaison récente vs historique complet.',
  factures: 'Nombre moyen de factures émises par mois. Mesure le rythme de facturation réel.',
  tauxTransfo: 'Taux de transformation des devis en factures (en %). Compare le taux récent au taux historique.',
  score: 'Score composite 0-100 basé sur 4 métriques pondérées : CA (40%), Dossiers (25%), Taux transfo (20%), Factures (15%). 50 = stable, <35 = alerte baisse, >65 = hausse.',
};

function CircularGauge({ score, color }: { score: number; color: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={radius}
        fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - progress}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        className="transition-all duration-700"
      />
      <text x="50" y="46" textAnchor="middle" className="fill-foreground text-xl font-bold" fontSize="22">{score}</text>
      <text x="50" y="62" textAnchor="middle" className="fill-muted-foreground" fontSize="10">/ 100</text>
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

function MetricRow({ label, metric, format, tooltip }: { label: string; metric: MetricVariation; format?: (v: number) => string; tooltip?: string }) {
  const fmt = format || ((v: number) => String(v));
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground flex items-center gap-1">
        {label}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-3 h-3 text-muted-foreground/50 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </span>
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground text-xs cursor-help underline decoration-dotted underline-offset-2">
              moy. {fmt(metric.avg)}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Moyenne mensuelle sur tout l'historique (hors période récente)
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="font-medium cursor-help">{fmt(metric.recent)}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Valeur sur la période récente sélectionnée
          </TooltipContent>
        </Tooltip>
        <VariationBadge pct={metric.variationPct} />
      </div>
    </div>
  );
}

const euroFmt = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
const numFmt = (v: number) => v.toFixed(1);
const pctFmt = (v: number) => `${v.toFixed(0)}%`;

const PERIOD_LABELS: Record<RecentMonthsOption, string> = {
  1: 'Dernier mois',
  3: '3 derniers mois',
};

export function ApporteurScoreCard({ score: defaultScore, monthlyTrendFull }: Props) {
  const [recentMonths, setRecentMonths] = useState<RecentMonthsOption>(3);

  // Recompute score when user toggles period
  const activeScore = useMemo(() => {
    if (recentMonths === 3) return defaultScore;
    return computeAdaptiveScore(monthlyTrendFull, recentMonths) ?? defaultScore;
  }, [recentMonths, monthlyTrendFull, defaultScore]);

  const color = LEVEL_COLORS[activeScore.level];

  return (
    <TooltipProvider delayDuration={200}>
      <Card className={`border ${LEVEL_BG[activeScore.level]}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-5">
            {/* Gauge */}
            <div className="flex flex-col items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <CircularGauge score={activeScore.score} color={color} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-xs">
                  {METRIC_TOOLTIPS.score}
                </TooltipContent>
              </Tooltip>
              <span className="text-sm font-semibold" style={{ color }}>
                {activeScore.label}
              </span>
            </div>

            {/* Metrics */}
            <div className="flex-1 min-w-0">
              {/* Period toggle */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">
                  {PERIOD_LABELS[recentMonths]} vs moyenne historique
                </p>
                <div className="inline-flex rounded-md border border-border overflow-hidden">
                  {([1, 3] as RecentMonthsOption[]).map(opt => (
                    <button
                      key={opt}
                      onClick={() => setRecentMonths(opt)}
                      className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        recentMonths === opt
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {opt === 1 ? '1 mois' : '3 mois'}
                    </button>
                  ))}
                </div>
              </div>

              <MetricRow label="CA / mois" metric={activeScore.metrics.ca} format={euroFmt} tooltip={METRIC_TOOLTIPS.ca} />
              <MetricRow label="Dossiers / mois" metric={activeScore.metrics.dossiers} format={numFmt} tooltip={METRIC_TOOLTIPS.dossiers} />
              <MetricRow label="Factures / mois" metric={activeScore.metrics.factures} format={numFmt} tooltip={METRIC_TOOLTIPS.factures} />
              {activeScore.metrics.tauxTransfo.avg !== null && activeScore.metrics.tauxTransfo.recent !== null && (
                <MetricRow
                  label="Taux transfo"
                  metric={activeScore.metrics.tauxTransfo as MetricVariation}
                  format={pctFmt}
                  tooltip={METRIC_TOOLTIPS.tauxTransfo}
                />
              )}
            </div>
          </div>

          {/* Alerts */}
          {activeScore.alerts.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {activeScore.alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                  <span>{alert}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
