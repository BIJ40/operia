/**
 * RentabiliteSegments — Pill-style segment filters for the profitability list.
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type RentabiliteSegment = 'all' | 'reliable' | 'to_complete' | 'deficit' | 'not_calculated';

interface SegmentConfig {
  id: RentabiliteSegment;
  label: string;
  count: number;
}

interface RentabiliteSegmentsProps {
  activeSegment: RentabiliteSegment;
  onSegmentChange: (segment: RentabiliteSegment) => void;
  counts: Record<RentabiliteSegment, number>;
}

export function RentabiliteSegments({ activeSegment, onSegmentChange, counts }: RentabiliteSegmentsProps) {
  const segments: SegmentConfig[] = [
    { id: 'all', label: 'Tous', count: counts.all },
    { id: 'reliable', label: 'Fiables', count: counts.reliable },
    { id: 'to_complete', label: 'À compléter', count: counts.to_complete },
    { id: 'deficit', label: 'Déficitaires', count: counts.deficit },
    { id: 'not_calculated', label: 'Non calculés', count: counts.not_calculated },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {segments.map((seg) => (
        <button
          key={seg.id}
          onClick={() => onSegmentChange(seg.id)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            activeSegment === seg.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          {seg.label}
          <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
            {seg.count}
          </Badge>
        </button>
      ))}
    </div>
  );
}
