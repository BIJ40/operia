/**
 * ApporteurFunnel - Double funnel :
 * 1. Devis → Factures (pipeline devis)
 * 2. Dossiers → Factures (taux global de transformation)
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
      <div className="h-7 bg-muted/50 rounded-lg overflow-hidden">
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
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pipeline de transformation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Pipeline Dossier → Facture */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Dossier → Facture</p>
          <div className="space-y-2">
            <FunnelStep label="Dossiers reçus" value={kpis.dossiers_received} maxValue={Math.max(kpis.dossiers_received, 1)} color="bg-blue-500" />
            <FunnelStep label="Facturés" value={kpis.factures} maxValue={Math.max(kpis.dossiers_received, 1)} color="bg-emerald-500" />
            {kpis.dossiers_avec_facture_sans_devis > 0 && (
              <p className="text-xs text-muted-foreground pl-1">
                dont {kpis.dossiers_avec_facture_sans_devis} sans devis (facturation directe)
              </p>
            )}
          </div>
        </div>

        {/* Pipeline Devis → Signature */}
        {kpis.devis_total > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Devis → Signature</p>
            <div className="space-y-2">
              <FunnelStep label="Devis émis" value={kpis.devis_total} maxValue={Math.max(kpis.devis_total, 1)} color="bg-indigo-500" />
              <FunnelStep label="Devis signés" value={kpis.devis_signed} maxValue={Math.max(kpis.devis_total, 1)} color="bg-green-500" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
