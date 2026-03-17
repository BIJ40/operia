/**
 * SyntheseSection — KPI overview + reliability + actionability badges.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReliabilityBadge } from '../list/ReliabilityBadge';
import { ActionabilityBadge } from '../list/ActionabilityBadge';
import { formatCurrency, formatPercent, formatHours, FLAG_LABELS, FLAG_SEVERITY } from '../constants';
import type { ProfitabilityResult } from '@/types/projectProfitability';
import type { ProfitabilitySnapshot } from '@/types/projectProfitability';
import { AlertTriangle, CheckCircle, Info, Clock } from 'lucide-react';

interface SyntheseSectionProps {
  result: ProfitabilityResult | null;
  snapshot: ProfitabilitySnapshot | null;
  isSnapshotOutdated: boolean;
}

function KpiCard({ label, value, subtitle, negative }: { label: string; value: string; subtitle?: string; negative?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-lg font-semibold ${negative ? 'text-destructive' : ''}`}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export function SyntheseSection({ result, snapshot, isSnapshotOutdated }: SyntheseSectionProps) {
  const data = result ?? (snapshot ? {
    caInvoicedHT: snapshot.ca_invoiced_ht,
    caCollectedTTC: snapshot.ca_collected_ttc,
    costLabor: snapshot.cost_labor,
    costTotal: snapshot.cost_total,
    grossMargin: snapshot.gross_margin,
    netMargin: snapshot.net_margin,
    marginPct: snapshot.margin_pct,
    hoursTotal: snapshot.hours_total,
    completenessScore: snapshot.completeness_score,
    reliabilityLevel: snapshot.reliability_level,
    flags: snapshot.flags_json ?? [],
    actionabilityLevel: snapshot.completeness_score >= 80 ? 'exploitable' as const : snapshot.completeness_score >= 60 ? 'partial' as const : 'not_exploitable' as const,
  } : null);

  if (!data) return null;

  // Determine global estimation badge
  const hasEstimated = data.flags.includes('labor_cost_estimated');
  const hasPartialCoverage = data.flags.includes('partial_cost_profile_coverage');
  const estimationLabel = hasEstimated && hasPartialCoverage
    ? 'Majoritairement estimé'
    : hasEstimated || hasPartialCoverage
    ? 'Partiellement estimé'
    : 'Données fiables';
  const estimationColor = hasEstimated && hasPartialCoverage
    ? 'bg-destructive/10 text-destructive'
    : hasEstimated || hasPartialCoverage
    ? 'bg-amber-100 text-amber-700'
    : 'bg-green-100 text-green-700';

  return (
    <div className="space-y-4">
      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        <ReliabilityBadge level={data.reliabilityLevel} score={data.completenessScore} />
        <ActionabilityBadge level={data.actionabilityLevel} />
        <Badge variant="outline" className={estimationColor}>
          {estimationLabel}
        </Badge>
        {isSnapshotOutdated && (
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Données modifiées depuis le calcul
          </Badge>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="CA facturé HT" value={formatCurrency(data.caInvoicedHT)} />
        <KpiCard label="Coût total" value={formatCurrency(data.costTotal)} />
        <KpiCard
          label="Marge nette"
          value={formatCurrency(data.netMargin)}
          negative={data.netMargin < 0}
        />
        <KpiCard
          label="% Marge"
          value={formatPercent(data.marginPct)}
          negative={data.marginPct !== null && data.marginPct < 0}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="CA encaissé TTC" value={formatCurrency(data.caCollectedTTC)} />
        <KpiCard label="Coût MO" value={formatCurrency(data.costLabor)} subtitle={hasEstimated ? 'Estimé' : 'Réel'} />
        <KpiCard label="Marge brute" value={formatCurrency(data.grossMargin)} negative={data.grossMargin < 0} />
        <KpiCard label="Heures" value={formatHours(data.hoursTotal)} />
      </div>

      {/* Flags */}
      {data.flags.length > 0 && (
        <div className="space-y-1.5 pt-2">
          <p className="text-xs font-medium text-muted-foreground">Alertes</p>
          {data.flags.map((flag) => {
            const severity = FLAG_SEVERITY[flag] ?? 'info';
            const Icon = severity === 'error' ? AlertTriangle : severity === 'warning' ? Info : CheckCircle;
            return (
              <div key={flag} className="flex items-center gap-2 text-sm">
                <Icon className={`h-3.5 w-3.5 ${severity === 'error' ? 'text-destructive' : severity === 'warning' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                <span>{FLAG_LABELS[flag] ?? flag}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
