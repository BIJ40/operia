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
    showPulseRings?: boolean;
    glowColor?: string;
    glowIntensity?: 'low' | 'medium' | 'high';
  };
};

export const UNIFIED_SEARCH_ANIMATIONS: UnifiedSearchAnimationPreset[] = [
  {
    id: 'breathing',
    label: 'Breathing',
    description: 'Effet de respiration prononcé avec glow pulsant visible.',
    buttonMotion: {
      initial: { scale: 1, opacity: 1 },
      animate: { scale: [1, 1.12, 1] },
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
      whileHover: { scale: 1.18 },
      whileTap: { scale: 0.9 }
    },
    decorators: {
      showGlow: true,
      showPulseRings: true,
      glowColor: 'hsl(var(--helpconfort-blue))',
      glowIntensity: 'high'
    }
  },
  {
    id: 'glow_orbit',
    label: 'Glow + Orbit',
    description: 'Auréole intense et point lumineux qui orbite visiblement.',
    buttonMotion: {
      initial: { scale: 1 },
      animate: { scale: [1, 1.05, 1] },
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
      whileHover: { scale: 1.12, boxShadow: '0 0 30px hsl(var(--helpconfort-blue) / 0.7)' },
      whileTap: { scale: 0.92 }
    },
    decorators: {
      showGlow: true,
      showOrbit: true,
      glowColor: 'hsl(var(--helpconfort-blue))',
      glowIntensity: 'high'
    }
  },
  {
    id: 'wave_pulse',
    label: 'IA Wave',
    description: 'Pulsations énergiques avec points animés bien visibles.',
    buttonMotion: {
      initial: { scale: 1 },
      animate: { scale: [1, 1.08, 1] },
      transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
      whileHover: { scale: 1.15 },
      whileTap: { scale: 0.9 }
    },
    decorators: {
      showWaveDots: true,
      showGlow: true,
      showPulseRings: true,
      glowColor: 'hsl(var(--helpconfort-orange))',
      glowIntensity: 'high'
    }
  },
  {
    id: 'neon_pulse',
    label: 'Neon Pulse',
    description: 'Anneaux néon subtils qui se propagent.',
    buttonMotion: {
      initial: { scale: 1 },
      animate: { scale: [1, 1.03, 1] },
      transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
      whileHover: { scale: 1.08 },
      whileTap: { scale: 0.95 }
    },
    decorators: {
      showNeonRing: true,
      showGlow: true,
      glowColor: 'hsl(var(--primary))',
      glowIntensity: 'medium'
    }
  },
  {
    id: 'float_bounce',
    label: 'Float Bounce',
    description: 'Flottement vertical prononcé avec ombre dynamique.',
    buttonMotion: {
      initial: { y: 0 },
      animate: { y: [0, -12, 0] },
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
      whileHover: { scale: 1.1, y: -16 },
      whileTap: { scale: 0.92, y: 0 }
    },
    decorators: {
      showGlow: true,
      showPulseRings: true,
      glowColor: 'hsl(var(--helpconfort-blue))',
      glowIntensity: 'medium'
    }
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Animation subtile au survol uniquement.',
    buttonMotion: {
      initial: { scale: 1 },
      animate: { scale: 1 },
      transition: { duration: 0.2 },
      whileHover: { scale: 1.08, boxShadow: '0 0 20px hsl(var(--primary) / 0.4)' },
      whileTap: { scale: 0.95 }
    },
    decorators: {
      showGlow: true,
      glowIntensity: 'low'
    }
  }
];

export const DEFAULT_ANIMATION_PRESET = UNIFIED_SEARCH_ANIMATIONS.find(a => a.id === 'breathing')!;
