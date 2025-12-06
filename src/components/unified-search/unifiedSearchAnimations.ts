/**
 * Presets d'animation pour la barre de recherche unifiée
 * Chaque preset définit le comportement Framer Motion du bouton flottant
 */

import type { TargetAndTransition, Transition, Target } from 'framer-motion';

export type UnifiedSearchAnimationId =
  | 'breathing'
  | 'glow_orbit'
  | 'wave_pulse'
  | 'minimal'
  | 'neon_pulse'
  | 'float_bounce';

export type UnifiedSearchAnimationPreset = {
  id: UnifiedSearchAnimationId;
  label: string;
  description: string;
  // Config Framer Motion principale pour le bouton
  buttonMotion: {
    initial?: Target;
    animate?: TargetAndTransition;
    transition?: Transition;
    whileHover?: TargetAndTransition;
    whileTap?: TargetAndTransition;
  };
  // Optionnel : éléments décoratifs (aura, points, waveform…)
  decorators?: {
    showGlow?: boolean;
    showWaveDots?: boolean;
    showOrbit?: boolean;
    showNeonRing?: boolean;
    glowColor?: string;
  };
};

export const UNIFIED_SEARCH_ANIMATIONS: UnifiedSearchAnimationPreset[] = [
  {
    id: 'breathing',
    label: 'Breathing',
    description: 'Léger effet de respiration (scale) + glow discret. Élégant et professionnel.',
    buttonMotion: {
      initial: { scale: 1, opacity: 1 },
      animate: { scale: [1, 1.05, 1] },
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
      whileHover: { scale: 1.08 },
      whileTap: { scale: 0.95 }
    },
    decorators: {
      showGlow: true,
      glowColor: 'hsl(var(--helpconfort-blue))'
    }
  },
  {
    id: 'glow_orbit',
    label: 'Glow + Orbit',
    description: 'Bouton stable avec auréole et petit point lumineux qui orbite autour.',
    buttonMotion: {
      initial: { scale: 1 },
      animate: { scale: 1 },
      transition: { duration: 0.3 },
      whileHover: { scale: 1.05, boxShadow: '0 0 20px hsl(var(--helpconfort-blue) / 0.5)' },
      whileTap: { scale: 0.95 }
    },
    decorators: {
      showGlow: true,
      showOrbit: true,
      glowColor: 'hsl(var(--helpconfort-blue))'
    }
  },
  {
    id: 'wave_pulse',
    label: 'IA Wave',
    description: 'Pulsations rapides façon IA en réflexion, avec 3 points animés.',
    buttonMotion: {
      initial: { scale: 1 },
      animate: { scale: [1, 1.03, 1] },
      transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
      whileHover: { scale: 1.07 },
      whileTap: { scale: 0.95 }
    },
    decorators: {
      showWaveDots: true,
      showGlow: true,
      glowColor: 'hsl(var(--helpconfort-orange))'
    }
  },
  {
    id: 'neon_pulse',
    label: 'Neon Pulse',
    description: 'Anneau néon pulsant autour du bouton. Effet futuriste.',
    buttonMotion: {
      initial: { scale: 1 },
      animate: { scale: [1, 1.02, 1] },
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
      whileHover: { scale: 1.06 },
      whileTap: { scale: 0.94 }
    },
    decorators: {
      showNeonRing: true,
      showGlow: true,
      glowColor: 'hsl(var(--primary))'
    }
  },
  {
    id: 'float_bounce',
    label: 'Float Bounce',
    description: 'Le bouton flotte légèrement de haut en bas. Effet d\'apesanteur.',
    buttonMotion: {
      initial: { y: 0 },
      animate: { y: [0, -6, 0] },
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
      whileHover: { scale: 1.05, y: -8 },
      whileTap: { scale: 0.95, y: 0 }
    },
    decorators: {
      showGlow: true,
      glowColor: 'hsl(var(--helpconfort-blue))'
    }
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Aucune animation permanente, juste hover/tap. Sobre et discret.',
    buttonMotion: {
      initial: { scale: 1 },
      animate: { scale: 1 },
      transition: { duration: 0.2 },
      whileHover: { scale: 1.03 },
      whileTap: { scale: 0.97 }
    }
  }
];

export const DEFAULT_ANIMATION_PRESET = UNIFIED_SEARCH_ANIMATIONS.find(a => a.id === 'breathing')!;
