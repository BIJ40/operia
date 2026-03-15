import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TechnicianCharge } from '@/statia/shared/chargeTravauxEngine';

interface Props {
  data: TechnicianCharge[];
}

export function ChargeTechnicienCard({ data }: Props) {
  const displayed = data.slice(0, 10);
  const maxHours = Math.max(...displayed.map(d => d.hours), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Charge par technicien</CardTitle>
      </CardHeader>
      <CardContent>
        {displayed.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Aucun technicien identifié</p>
        ) : (
          <div className="space-y-2">
            {displayed.map(t => {
              const pct = (t.hours / maxHours) * 100;
              return (
                <div key={t.technicianId} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono text-muted-foreground">Tech #{t.technicianId}</span>
                    <span className="font-medium">{t.hours}h · {t.projects} dossier{t.projects > 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
