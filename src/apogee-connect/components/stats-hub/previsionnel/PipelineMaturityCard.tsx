import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PipelineMaturityInfo } from '@/statia/shared/chargeTravauxEngine';

const STAGES = [
  { key: 'commercial' as const, label: 'Commercial', color: 'hsl(var(--primary))' },
  { key: 'a_commander' as const, label: 'À commander', color: 'hsl(35, 90%, 60%)' },
  { key: 'pret_planification' as const, label: 'Prêt planif.', color: 'hsl(200, 85%, 60%)' },
  { key: 'planifie' as const, label: 'Planifié', color: 'hsl(142, 76%, 36%)' },
  { key: 'bloque' as const, label: 'Bloqué', color: 'hsl(0, 84%, 60%)' },
];

interface Props {
  data: PipelineMaturityInfo;
}

export function PipelineMaturityCard({ data }: Props) {
  const total = STAGES.reduce((s, st) => s + data[st.key], 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Maturité pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {STAGES.map(stage => {
          const value = data[stage.key];
          const pct = total > 0 ? (value / total) * 100 : 0;
          return (
            <div key={stage.key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{stage.label}</span>
                <span className="font-medium">{value}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: stage.color }}
                />
              </div>
            </div>
          );
        })}
        {total === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">Aucun dossier</p>
        )}
      </CardContent>
    </Card>
  );
}
