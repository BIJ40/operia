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

// VERSION 1: Gradient bas-droite + icône circulaire outline
function TileVariant1({ title, description, icon: Icon, href, badge }: IndexTileProps) {
  return (
    <Link to={href}>
      <div className="group h-full rounded-xl border border-helpconfort-blue/20 p-5
        bg-gradient-to-br from-white to-helpconfort-blue/5
        shadow-sm transition-all duration-300
        hover:to-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
            group-hover:border-helpconfort-blue group-hover:bg-white/50 transition-all">
            <Icon className="w-5 h-5 text-helpconfort-blue" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {badge && (
                <Badge className="text-xs bg-helpconfort-blue/10 text-helpconfort-blue border border-helpconfort-blue/30">
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

// VERSION 2: Gradient haut-bas + icône carrée bordée
function TileVariant2({ title, description, icon: Icon, href, badge }: IndexTileProps) {
  return (
    <Link to={href}>
      <div className="group h-full rounded-xl border border-helpconfort-blue/15 p-5
        bg-gradient-to-b from-helpconfort-blue/5 to-white
        shadow-sm transition-all duration-300
        hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg border-2 border-helpconfort-blue/25 flex items-center justify-center
            group-hover:border-helpconfort-blue group-hover:bg-white transition-all">
            <Icon className="w-5 h-5 text-helpconfort-blue" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {badge && (
                <Badge className="text-xs bg-helpconfort-blue/10 text-helpconfort-blue border border-helpconfort-blue/30">
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

// VERSION 4: Gradient gauche-droite + bordure gauche accent
function TileVariant4({ title, description, icon: Icon, href, badge }: IndexTileProps) {
  return (
    <Link to={href}>
      <div className="group h-full rounded-xl border border-helpconfort-blue/15 p-5
        border-l-4 border-l-helpconfort-blue/40
        bg-gradient-to-r from-helpconfort-blue/5 to-white
        shadow-sm transition-all duration-300
        hover:from-helpconfort-blue/15 hover:border-l-helpconfort-blue hover:shadow-lg hover:-translate-y-1">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
            group-hover:border-helpconfort-blue group-hover:bg-white transition-all">
            <Icon className="w-5 h-5 text-helpconfort-blue" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {badge && (
                <Badge className="text-xs bg-helpconfort-blue/10 text-helpconfort-blue border border-helpconfort-blue/30">
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

// VERSION 7: Gradient coin haut-gauche + icône en haut
function TileVariant7({ title, description, icon: Icon, href, badge }: IndexTileProps) {
  return (
    <Link to={href}>
      <div className="group h-full rounded-xl border border-helpconfort-blue/15 p-5
        bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white
        shadow-sm transition-all duration-300
        hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-1">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
              group-hover:border-helpconfort-blue group-hover:bg-white transition-all">
              <Icon className="w-5 h-5 text-helpconfort-blue" />
            </div>
            {badge && (
              <Badge className="text-xs bg-helpconfort-blue/10 text-helpconfort-blue border border-helpconfort-blue/30">
                {badge}
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
}

const VARIANTS: Record<1 | 2 | 4 | 7, React.FC<IndexTileProps>> = {
  1: TileVariant1,
  2: TileVariant2,
  4: TileVariant4,
  7: TileVariant7,
};

// Array of available variants for cycling
const VARIANT_CYCLE: (1 | 2 | 4 | 7)[] = [1, 2, 4, 7];

export function IndexTile({ variant = 1, ...props }: IndexTileProps) {
  const TileComponent = VARIANTS[variant];
  return <TileComponent {...props} />;
}

// Helper to get variant based on index (for automatic distribution)
export function getVariantForIndex(index: number): 1 | 2 | 4 | 7 {
  return VARIANT_CYCLE[index % VARIANT_CYCLE.length];
}
