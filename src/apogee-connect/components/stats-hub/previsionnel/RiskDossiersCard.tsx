import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import type { RiskProjectEntry } from '@/statia/shared/chargeTravauxEngine';

interface Props {
  projects: RiskProjectEntry[];
}

function riskColor(score: number): string {
  if (score >= 0.8) return 'hsl(0, 84%, 60%)';
  if (score >= 0.6) return 'hsl(25, 95%, 53%)';
  return 'hsl(45, 93%, 47%)';
}

const formatCurrency = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${Math.round(v)}€`;
const pct = (v: number) => `${Math.round(v * 100)}%`;

function RiskBreakdown({ p }: { p: RiskProjectEntry }) {
  return (
    <div className="space-y-2 text-xs">
      <p className="font-semibold text-sm">{p.reference || p.projectId}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Flux <span className="text-[10px]">(25%)</span></span>
          <span className="font-medium" style={{ color: riskColor(p.riskFlux) }}>{pct(p.riskFlux)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full" style={{ width: pct(p.riskFlux), backgroundColor: riskColor(p.riskFlux) }} />
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Données <span className="text-[10px]">(40%)</span></span>
          <span className="font-medium" style={{ color: riskColor(p.riskData) }}>{pct(p.riskData)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full" style={{ width: pct(p.riskData), backgroundColor: riskColor(p.riskData) }} />
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Valeur <span className="text-[10px]">(35%)</span></span>
          <span className="font-medium" style={{ color: riskColor(p.riskValue) }}>{pct(p.riskValue)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full" style={{ width: pct(p.riskValue), backgroundColor: riskColor(p.riskValue) }} />
        </div>
      </div>
      <div className="pt-1 border-t flex justify-between font-semibold">
        <span>Score global</span>
        <span style={{ color: riskColor(p.riskScoreGlobal) }}>{pct(p.riskScoreGlobal)}</span>
      </div>
      {p.ageDays !== null && (
        <p className="text-muted-foreground text-[10px]">Âge : {p.ageDays}j</p>
      )}
    </div>
  );
}

export function RiskDossiersCard({ projects }: Props) {
  const displayed = projects.slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Dossiers à risque ({projects.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {displayed.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Aucun dossier à risque élevé</p>
        ) : (
          <div className="space-y-2">
            {displayed.map(p => (
              <HoverCard key={String(p.projectId)} openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <div className="flex items-center justify-between gap-2 text-xs cursor-help">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: riskColor(p.riskScoreGlobal) }} />
                      <span className="font-mono truncate">{p.reference || p.projectId}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {p.etatWorkflowLabel}
                      </Badge>
                      {p.devisHT > 0 && <span className="text-muted-foreground">{formatCurrency(p.devisHT)}</span>}
                      <span className="font-semibold" style={{ color: riskColor(p.riskScoreGlobal) }}>
                        {Math.round(p.riskScoreGlobal * 100)}%
                      </span>
                    </div>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent side="left" className="w-64">
                  <RiskBreakdown p={p} />
                </HoverCardContent>
              </HoverCard>
            ))}
            {projects.length > 8 && (
              <p className="text-[10px] text-muted-foreground text-center">+{projects.length - 8} autres</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
