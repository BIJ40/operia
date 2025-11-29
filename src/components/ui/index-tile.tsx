import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface IndexTileProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  badge?: string;
  variant?: 1 | 2 | 4 | 7;
}

// Design system unifié - Style des guides (gradient bleu, border-l accent, hover effects)
function UnifiedTile({ title, description, icon: Icon, href, badge }: IndexTileProps) {
  return (
    <Link to={href}>
      <div className="group h-full rounded-xl p-5
        bg-gradient-to-r from-helpconfort-blue/10 via-helpconfort-blue/5 to-transparent
        border border-helpconfort-blue/20 border-l-4 border-l-helpconfort-blue
        shadow-sm transition-all duration-300
        hover:from-helpconfort-blue/15 hover:via-helpconfort-blue/8 hover:border-helpconfort-blue/30 hover:shadow-lg hover:-translate-y-0.5">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
            bg-white/50 group-hover:border-helpconfort-blue group-hover:bg-white transition-all">
            <Icon className="w-5 h-5 text-helpconfort-blue" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {badge && (
                <Badge className="text-xs bg-helpconfort-blue text-white border-0">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Toutes les variantes utilisent maintenant le design unifié
const VARIANTS: Record<1 | 2 | 4 | 7, React.FC<IndexTileProps>> = {
  1: UnifiedTile,
  2: UnifiedTile,
  4: UnifiedTile,
  7: UnifiedTile,
};

// Array of available variants for cycling (kept for backward compatibility)
const VARIANT_CYCLE: (1 | 2 | 4 | 7)[] = [1, 2, 4, 7];

export function IndexTile({ variant = 1, ...props }: IndexTileProps) {
  const TileComponent = VARIANTS[variant];
  return <TileComponent {...props} />;
}

// Helper to get variant based on index (kept for backward compatibility)
export function getVariantForIndex(index: number): 1 | 2 | 4 | 7 {
  return VARIANT_CYCLE[index % VARIANT_CYCLE.length];
}
