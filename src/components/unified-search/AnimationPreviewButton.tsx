/**
 * Bouton de prévisualisation pour le playground d'animations
 * Affiche un mini-bouton avec l'animation appliquée
 */

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { UnifiedSearchAnimationPreset } from './unifiedSearchAnimations';
import { GlowDecorator, OrbitDecorator, WaveDotsDecorator, NeonRingDecorator } from './AnimationDecorators';
import { cn } from '@/lib/utils';

interface AnimationPreviewButtonProps {
  preset: UnifiedSearchAnimationPreset;
  size?: 'sm' | 'md';
}

export function AnimationPreviewButton({ preset, size = 'md' }: AnimationPreviewButtonProps) {
  const sizeClasses = size === 'sm' 
    ? 'w-10 h-10' 
    : 'w-14 h-14';
  
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';

  return (
    <div className="relative flex items-center justify-center">
      {/* Décorateurs */}
      {preset.decorators?.showGlow && (
        <GlowDecorator glowColor={preset.decorators.glowColor} />
      )}
      {preset.decorators?.showOrbit && (
        <OrbitDecorator glowColor={preset.decorators.glowColor} />
      )}
      {preset.decorators?.showNeonRing && (
        <NeonRingDecorator glowColor={preset.decorators.glowColor} />
      )}
      {preset.decorators?.showWaveDots && (
        <WaveDotsDecorator glowColor={preset.decorators.glowColor} />
      )}
      
      {/* Bouton animé */}
      <motion.div
        className={cn(
          sizeClasses,
          "relative z-10 flex items-center justify-center rounded-full",
          "bg-gradient-to-br from-primary/20 to-primary/30",
          "border border-primary/30",
          "cursor-pointer"
        )}
        initial={preset.buttonMotion.initial as any}
        animate={preset.buttonMotion.animate as any}
        transition={preset.buttonMotion.transition as any}
        whileHover={preset.buttonMotion.whileHover as any}
        whileTap={preset.buttonMotion.whileTap as any}
      >
        <Sparkles className={cn(iconSize, "text-primary")} />
      </motion.div>
    </div>
  );
}
