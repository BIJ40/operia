export type AccentThemeKey =
  | 'blue'
  | 'purple'
  | 'green'
  | 'orange'
  | 'amber'
  | 'pink'
  | 'teal'
  | 'cyan'
  | 'red'
  | 'neutral';

/**
 * Thèmes de couleurs pastel basés sur les tokens (voir index.css / tailwind.config.ts).
 * Objectif: réutiliser exactement la même identité (onglets, tuiles, badges) sans couleurs "hardcodées".
 */
export const ACCENT_THEMES: Record<
  AccentThemeKey,
  {
    /** Gradient pour fonds décoratifs / icônes */
    gradient: string;
    /** Couleur de fond "solide" (icône carré) */
    solidBg: string;
    /** Couleur texte associée */
    text: string;
    /** Petits points / puces */
    dot: string;
  }
> = {
  blue: {
    gradient: 'from-warm-blue/70 to-warm-teal/50',
    solidBg: 'bg-warm-blue/80',
    text: 'text-warm-blue/90',
    dot: 'bg-warm-blue/70',
  },
  purple: {
    gradient: 'from-warm-purple/70 to-warm-blue/50',
    solidBg: 'bg-warm-purple/80',
    text: 'text-warm-purple/90',
    dot: 'bg-warm-purple/70',
  },
  green: {
    gradient: 'from-warm-green/70 to-warm-teal/50',
    solidBg: 'bg-warm-green/80',
    text: 'text-warm-green/90',
    dot: 'bg-warm-green/70',
  },
  orange: {
    gradient: 'from-warm-orange/70 to-accent/50',
    solidBg: 'bg-warm-orange/80',
    text: 'text-warm-orange/90',
    dot: 'bg-warm-orange/70',
  },
  amber: {
    gradient: 'from-amber-500/70 to-yellow-400/50',
    solidBg: 'bg-amber-500/80',
    text: 'text-amber-600',
    dot: 'bg-amber-500/70',
  },
  pink: {
    gradient: 'from-warm-pink/70 to-warm-purple/50',
    solidBg: 'bg-warm-pink/80',
    text: 'text-warm-pink/90',
    dot: 'bg-warm-pink/70',
  },
  teal: {
    gradient: 'from-warm-teal/70 to-warm-blue/50',
    solidBg: 'bg-warm-teal/80',
    text: 'text-warm-teal/90',
    dot: 'bg-warm-teal/70',
  },
  cyan: {
    gradient: 'from-warm-cyan/70 to-warm-teal/50',
    solidBg: 'bg-warm-cyan/80',
    text: 'text-warm-cyan/90',
    dot: 'bg-warm-cyan/70',
  },
  red: {
    gradient: 'from-warm-red/70 to-warm-orange/50',
    solidBg: 'bg-warm-red/80',
    text: 'text-warm-red/90',
    dot: 'bg-warm-red/70',
  },
  neutral: {
    gradient: 'from-muted/70 to-muted/50',
    solidBg: 'bg-muted/80',
    text: 'text-muted-foreground/90',
    dot: 'bg-muted-foreground/70',
  },
};
