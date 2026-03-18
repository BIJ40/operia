import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PipelineAgingInfo } from '@/statia/shared/chargeTravauxEngine';

const BUCKETS = [
  { key: 'bucket_0_7' as const, label: '0-7j', color: 'hsl(142, 76%, 36%)' },
  { key: 'bucket_8_15' as const, label: '8-15j', color: 'hsl(45, 93%, 47%)' },
  { key: 'bucket_16_30' as const, label: '16-30j', color: 'hsl(25, 95%, 53%)' },
  { key: 'bucket_30_plus' as const, label: '30j+', color: 'hsl(0, 84%, 60%)' },
  { key: 'unknown' as const, label: 'Inconnu', color: 'hsl(var(--muted-foreground))' },
];

interface Props {
  data: PipelineAgingInfo;
}

export function PipelineAgingCard({ data }: Props) {
  const max = Math.max(...BUCKETS.map(b => data[b.key]), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Ancienneté des dossiers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-32">
          {BUCKETS.map(bucket => {
            const value = data[bucket.key];
            const height = max > 0 ? (value / max) * 100 : 0;
            return (
              <div key={bucket.key} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium">{value}</span>
                <div className="w-full rounded-t relative" style={{ height: '100px' }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t transition-all duration-500"
                    style={{ height: `${height}%`, backgroundColor: bucket.color, minHeight: value > 0 ? '4px' : '0' }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{bucket.label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
