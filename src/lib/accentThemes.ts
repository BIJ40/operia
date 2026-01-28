export type AccentThemeKey =
  | 'blue'
  | 'purple'
  | 'green'
  | 'orange'
  | 'pink'
  | 'teal'
  | 'neutral';

/**
 * Thèmes de couleurs pastel basés sur les tokens (voir index.css / tailwind.config.ts).
 * Objectif: réutiliser exactement la même identité (onglets, tuiles, badges) sans couleurs “hardcodées”.
 */
export const ACCENT_THEMES: Record<
  AccentThemeKey,
  {
    /** Gradient pour fonds décoratifs / icônes */
    gradient: string;
    /** Couleur de fond “solide” (icône carré) */
    solidBg: string;
    /** Couleur texte associée */
    text: string;
    /** Petits points / puces */
    dot: string;
  }
> = {
  blue: {
    gradient: 'from-warm-blue/90 to-warm-teal/80',
    solidBg: 'bg-warm-blue',
    text: 'text-warm-blue',
    dot: 'bg-warm-blue',
  },
  purple: {
    gradient: 'from-warm-purple/90 to-warm-blue/70',
    solidBg: 'bg-warm-purple',
    text: 'text-warm-purple',
    dot: 'bg-warm-purple',
  },
  green: {
    gradient: 'from-warm-green/90 to-warm-teal/75',
    solidBg: 'bg-warm-green',
    text: 'text-warm-green',
    dot: 'bg-warm-green',
  },
  orange: {
    gradient: 'from-warm-orange/90 to-accent/80',
    solidBg: 'bg-warm-orange',
    text: 'text-warm-orange',
    dot: 'bg-warm-orange',
  },
  pink: {
    gradient: 'from-warm-pink/90 to-warm-purple/75',
    solidBg: 'bg-warm-pink',
    text: 'text-warm-pink',
    dot: 'bg-warm-pink',
  },
  teal: {
    gradient: 'from-warm-teal/90 to-warm-blue/70',
    solidBg: 'bg-warm-teal',
    text: 'text-warm-teal',
    dot: 'bg-warm-teal',
  },
  neutral: {
    gradient: 'from-muted to-muted',
    solidBg: 'bg-muted',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
};
