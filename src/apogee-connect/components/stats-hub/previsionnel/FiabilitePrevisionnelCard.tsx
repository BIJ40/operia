import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { DataQualityInfo } from '@/statia/shared/chargeTravauxEngine';

interface Props {
  data: DataQualityInfo;
}

function scoreColor(score: number): string {
  if (score >= 75) return 'hsl(142, 76%, 36%)';
  if (score >= 50) return 'hsl(45, 93%, 47%)';
  return 'hsl(0, 84%, 60%)';
}

export function FiabilitePrevisionnelCard({ data }: Props) {
  const { total, withHours, withDevis, withUnivers, withPlannedDate, score } = data;
  if (total === 0) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Fiabilité des données</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-muted-foreground text-center py-4">Aucun dossier</p></CardContent>
      </Card>
    );
  }

  const metrics = [
    { label: 'Avec heures', value: withHours, pct: Math.round((withHours / total) * 100) },
    { label: 'Avec devis', value: withDevis, pct: Math.round((withDevis / total) * 100) },
    { label: 'Avec univers', value: withUnivers, pct: Math.round((withUnivers / total) * 100) },
    { label: 'Avec date planif.', value: withPlannedDate, pct: Math.round((withPlannedDate / total) * 100) },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Fiabilité des données</CardTitle>
          <span className="text-lg font-bold" style={{ color: scoreColor(score) }}>{score}%</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {metrics.map(m => (
          <div key={m.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{m.label}</span>
              <span className="font-medium">{m.value}/{total} ({m.pct}%)</span>
            </div>
            <Progress value={m.pct} className="h-1.5" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
