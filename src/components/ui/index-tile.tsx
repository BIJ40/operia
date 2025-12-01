import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';

export interface IndexTileProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  badge?: string;
  variant?: 1 | 2 | 4 | 7;
}

/**
 * THÈME TUILES UNIFIÉ - "Unified Tiles Theme"
 * 
 * Spécifications :
 * - Dégradé bleu depuis un coin aléatoire vers son opposé
 * - Bordure bleue à gauche (border-l-4) qui PERSISTE au survol
 * - Au survol : anneau bleu autour de l'icône, ombre plus prononcée, légère élévation
 * - Couleur : helpconfort-blue uniquement (sauf spécification contraire explicite)
 */

// Directions de dégradé possibles (coin vers opposé)
const GRADIENT_DIRECTIONS = [
  'bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))]',
  'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))]',
  'bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))]',
  'bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))]',
  'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]',
  'bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))]',
  'bg-[radial-gradient(ellipse_at_left,_var(--tw-gradient-stops))]',
  'bg-[radial-gradient(ellipse_at_right,_var(--tw-gradient-stops))]',
];

// Hash stable basé sur le titre pour avoir un dégradé constant par tuile
function getStableGradientIndex(title: string): number {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    const char = title.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % GRADIENT_DIRECTIONS.length;
}

function UnifiedTile({ title, description, icon: Icon, href, badge }: IndexTileProps) {
  // Dégradé stable basé sur le titre
  const gradientClass = useMemo(() => {
    const index = getStableGradientIndex(title);
    return GRADIENT_DIRECTIONS[index];
  }, [title]);

  return (
    <Link to={href}>
      <div className={`group h-full rounded-xl p-5
        ${gradientClass}
        from-helpconfort-blue/10 via-white to-white
        dark:via-background dark:to-background
        border border-helpconfort-blue/20 border-l-4 border-l-helpconfort-blue
        shadow-sm transition-all duration-300
        hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5`}>
        <div className="flex items-center gap-4">
          {/* Icône avec anneau bleu au survol */}
          <div className="w-11 h-11 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
            bg-white/50 dark:bg-background/50 
            group-hover:border-helpconfort-blue group-hover:ring-2 group-hover:ring-helpconfort-blue/30 group-hover:bg-white dark:group-hover:bg-background 
            transition-all duration-300">
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

/**
 * Composant utilitaire pour appliquer le thème tuiles à n'importe quel contenu
 * Usage: <UnifiedTileWrapper title="Mon titre"><MonContenu /></UnifiedTileWrapper>
 */
export interface UnifiedTileWrapperProps {
  children: React.ReactNode;
  title: string; // Utilisé pour le hash du dégradé
  className?: string;
  onClick?: () => void;
}

export function UnifiedTileWrapper({ children, title, className = '', onClick }: UnifiedTileWrapperProps) {
  const gradientClass = useMemo(() => {
    const index = getStableGradientIndex(title);
    return GRADIENT_DIRECTIONS[index];
  }, [title]);

  return (
    <div 
      onClick={onClick}
      className={`group rounded-xl p-5
        ${gradientClass}
        from-helpconfort-blue/10 via-white to-white
        dark:via-background dark:to-background
        border border-helpconfort-blue/20 border-l-4 border-l-helpconfort-blue
        shadow-sm transition-all duration-300
        hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5
        ${onClick ? 'cursor-pointer' : ''}
        ${className}`}>
      {children}
    </div>
  );
}

// Export des constantes pour réutilisation dans d'autres composants
export const UNIFIED_TILE_CLASSES = {
  base: 'rounded-xl border border-helpconfort-blue/20 border-l-4 border-l-helpconfort-blue shadow-sm transition-all duration-300',
  gradient: 'from-helpconfort-blue/10 via-white to-white dark:via-background dark:to-background',
  hover: 'hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5',
  iconWrapper: 'w-11 h-11 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center bg-white/50 dark:bg-background/50',
  iconWrapperHover: 'group-hover:border-helpconfort-blue group-hover:ring-2 group-hover:ring-helpconfort-blue/30 group-hover:bg-white dark:group-hover:bg-background transition-all duration-300',
  icon: 'w-5 h-5 text-helpconfort-blue',
};

export { GRADIENT_DIRECTIONS, getStableGradientIndex };
