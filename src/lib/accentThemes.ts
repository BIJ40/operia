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
    gradient: 'from-warm-blue/60 to-warm-blue/60',
    solidBg: 'bg-warm-blue/70',
    text: 'text-warm-blue/90',
    dot: 'bg-warm-blue/60',
  },
  purple: {
    gradient: 'from-warm-purple/60 to-warm-purple/60',
    solidBg: 'bg-warm-purple/70',
    text: 'text-warm-purple/90',
    dot: 'bg-warm-purple/60',
  },
  green: {
    gradient: 'from-warm-green/60 to-warm-green/60',
    solidBg: 'bg-warm-green/70',
    text: 'text-warm-green/90',
    dot: 'bg-warm-green/60',
  },
  orange: {
    gradient: 'from-warm-orange/60 to-warm-orange/60',
    solidBg: 'bg-warm-orange/70',
    text: 'text-warm-orange/90',
    dot: 'bg-warm-orange/60',
  },
  amber: {
    gradient: 'from-amber-400/60 to-amber-400/60',
    solidBg: 'bg-amber-400/70',
    text: 'text-amber-600',
    dot: 'bg-amber-400/60',
  },
  pink: {
    gradient: 'from-warm-pink/60 to-warm-pink/60',
    solidBg: 'bg-warm-pink/70',
    text: 'text-warm-pink/90',
    dot: 'bg-warm-pink/60',
  },
  teal: {
    gradient: 'from-warm-teal/60 to-warm-teal/60',
    solidBg: 'bg-warm-teal/70',
    text: 'text-warm-teal/90',
    dot: 'bg-warm-teal/60',
  },
  cyan: {
    gradient: 'from-warm-cyan/60 to-warm-cyan/60',
    solidBg: 'bg-warm-cyan/70',
    text: 'text-warm-cyan/90',
    dot: 'bg-warm-cyan/60',
  },
  red: {
    gradient: 'from-warm-red/60 to-warm-red/60',
    solidBg: 'bg-warm-red/70',
    text: 'text-warm-red/90',
    dot: 'bg-warm-red/60',
  },
  neutral: {
    gradient: 'from-muted/60 to-muted/60',
    solidBg: 'bg-muted/70',
    text: 'text-muted-foreground/90',
    dot: 'bg-muted-foreground/60',
  },
};
