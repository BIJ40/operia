import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type {
  ForecastSnapshot,
  ForecastTensionSnapshot,
  ForecastRecommendation,
  PredictedTensionLevel,
  ForecastConfidenceLevel,
} from '@/modules/performance/forecast/types';

interface ForecastTechnicianDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: ForecastSnapshot | null;
  tension: ForecastTensionSnapshot | null;
  recommendations: ForecastRecommendation[];
}

function mToH(m: number): string { return `${Math.round(m / 60)}h`; }

const TENSION_LABEL: Record<PredictedTensionLevel, { label: string; className: string }> = {
  critical: { label: 'Critique', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  tension: { label: 'Tendu', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  watch: { label: 'Surveillance', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  comfort: { label: 'Confort', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

const CONF_LABEL: Record<ForecastConfidenceLevel, string> = {
  high: 'Haute', medium: 'Moyenne', low: 'Faible',
};

export function ForecastTechnicianDrawer({ open, onOpenChange, snapshot, tension, recommendations }: ForecastTechnicianDrawerProps) {
  if (!snapshot || !tension) return null;

  const capacity = snapshot.projectedCapacity.adjustedCapacityMinutes;
  const committed = snapshot.committedWorkload?.committedMinutes ?? 0;
  const probable = snapshot.probableWorkload?.probableMinutes ?? 0;
  const availableAfterProbable = snapshot.projectedAvailableMinutesAfterProbable
    ?? snapshot.projectedAvailableMinutesAfterCommitted
    ?? capacity;
  const ratio = snapshot.projectedGlobalLoadRatio ?? snapshot.projectedCommittedLoadRatio;
  const tensionStyle = TENSION_LABEL[tension.predictedTensionLevel];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{snapshot.name}</SheetTitle>
          <SheetDescription>
            Prévision {snapshot.horizon} — {CONF_LABEL[snapshot.forecastConfidenceLevel]}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Synthèse */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={tensionStyle.className}>
              {tensionStyle.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Confiance : {CONF_LABEL[snapshot.forecastConfidenceLevel]}
            </span>
          </div>

          {/* Charge */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Charge prévisionnelle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Capacité ajustée" value={mToH(capacity)} />
              <Row label="Engagé" value={committed > 0 ? mToH(committed) : '—'} />
              <Row label="Probable" value={probable > 0 ? mToH(probable) : '—'} />
              <Separator />
              <Row
                label="Disponible après probable"
                value={availableAfterProbable < 0 ? `-${mToH(Math.abs(availableAfterProbable))}` : mToH(availableAfterProbable)}
                highlight={availableAfterProbable < 0}
              />
              {ratio != null && (
                <Row label="Ratio global" value={`${Math.round(ratio * 100)}%`} />
              )}
            </CardContent>
          </Card>

          {/* Facteurs de tension */}
          {tension.factors.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Facteurs de tension</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-xs">
                  {tension.factors.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                        f.severity === 'critical' ? 'bg-red-500' : f.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-400'
                      }`} />
                      <span className="text-muted-foreground">{f.label}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recommandations */}
          {recommendations.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recommandations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendations.map(rec => (
                  <div key={rec.id} className="text-xs space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{rec.priority}</Badge>
                      <span className="font-medium">{rec.title}</span>
                    </div>
                    <p className="text-muted-foreground">{rec.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Source breakdown */}
          {snapshot.committedWorkload && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sources engagé</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                {Object.entries(snapshot.committedWorkload.sourceBreakdown)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => (
                    <Row key={k} label={k} value={mToH(v)} />
                  ))}
              </CardContent>
            </Card>
          )}

          {snapshot.probableWorkload && Object.keys(snapshot.probableWorkload.universeBreakdown).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Univers probable</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                {Object.entries(snapshot.probableWorkload.universeBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => (
                    <Row key={k} label={k === 'unknown' ? 'Non défini' : k} value={mToH(v)} />
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Penalties */}
          {snapshot.probableWorkload && snapshot.probableWorkload.probablePenalties.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pénalités probable</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                {snapshot.probableWorkload.probablePenalties.map((p, i) => (
                  <div key={i}>{p.reason} (−{Math.round(p.value * 100)}%)</div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={`font-medium ${highlight ? 'text-red-600 dark:text-red-400' : ''}`}>{value}</span>
    </div>
  );
}
