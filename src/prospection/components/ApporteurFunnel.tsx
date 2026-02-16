/**
 * ApporteurFunnel - Funnel visuel dossiers → devis → signés → factures
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AggregatedKPIs } from '../engine/aggregators';

interface Props {
  kpis: AggregatedKPIs;
}

function FunnelStep({ label, value, maxValue, color }: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}) {
  const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  const widthPct = maxValue > 0 ? Math.max((value / maxValue) * 100, 8) : 8;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value} <span className="text-xs text-muted-foreground">({pct}%)</span></span>
      </div>
      <div className="h-8 bg-muted/50 rounded-lg overflow-hidden">
        <div
          className={`h-full rounded-lg ${color} transition-all duration-500 flex items-center justify-center`}
          style={{ width: `${widthPct}%` }}
        >
          {widthPct > 20 && <span className="text-xs font-medium text-primary-foreground">{value}</span>}
        </div>
      </div>
    </div>
  );
}

export function ApporteurFunnel({ kpis }: Props) {
  const max = Math.max(kpis.dossiers_received, 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Funnel commercial</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <FunnelStep label="Dossiers reçus" value={kpis.dossiers_received} maxValue={max} color="bg-blue-500" />
        <FunnelStep label="Devis émis" value={kpis.devis_total} maxValue={max} color="bg-indigo-500" />
        <FunnelStep label="Devis signés" value={kpis.devis_signed} maxValue={max} color="bg-green-500" />
        <FunnelStep label="Factures" value={kpis.factures} maxValue={max} color="bg-emerald-500" />
      </CardContent>
    </Card>
  );
}
