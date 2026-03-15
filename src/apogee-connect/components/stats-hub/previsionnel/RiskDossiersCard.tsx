import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
              <div key={String(p.projectId)} className="flex items-center justify-between gap-2 text-xs">
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
