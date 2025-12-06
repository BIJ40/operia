/**
 * Bouton de prévisualisation pour le playground d'animations
 * Affiche un mini-bouton avec l'animation appliquée
 */

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { UnifiedSearchAnimationPreset } from './unifiedSearchAnimations';
import { GlowDecorator, OrbitDecorator, WaveDotsDecorator, NeonRingDecorator, PulseRingsDecorator } from './AnimationDecorators';
import { cn } from '@/lib/utils';

interface AnimationPreviewButtonProps {
  preset: UnifiedSearchAnimationPreset;
  size?: 'sm' | 'md' | 'lg';
}

export function AnimationPreviewButton({ preset, size = 'md' }: AnimationPreviewButtonProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };
  
  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  return (
    <div className="relative flex items-center justify-center p-8">
      {/* Décorateurs - ordre important pour le z-index */}
      {preset.decorators?.showGlow && (
        <GlowDecorator 
          glowColor={preset.decorators.glowColor} 
          intensity={preset.decorators.glowIntensity || 'medium'}
        />
      )}
      {preset.decorators?.showPulseRings && (
        <PulseRingsDecorator glowColor={preset.decorators.glowColor} />
      )}
      {preset.decorators?.showNeonRing && (
        <NeonRingDecorator glowColor={preset.decorators.glowColor} />
      )}
      {preset.decorators?.showOrbit && (
        <OrbitDecorator glowColor={preset.decorators.glowColor} />
      )}
      {preset.decorators?.showWaveDots && (
        <WaveDotsDecorator glowColor={preset.decorators.glowColor} />
      )}
      
      {/* Bouton animé */}
      <motion.div
        className={cn(
          sizeClasses[size],
          "relative z-10 flex items-center justify-center rounded-full",
          "bg-gradient-to-br from-helpconfort-blue/30 to-helpconfort-blue/50",
          "border-2 border-helpconfort-blue/50",
          "shadow-lg shadow-helpconfort-blue/30",
          "cursor-pointer"
        )}
        initial={preset.buttonMotion.initial as any}
        animate={preset.buttonMotion.animate as any}
        transition={preset.buttonMotion.transition as any}
        whileHover={preset.buttonMotion.whileHover as any}
        whileTap={preset.buttonMotion.whileTap as any}
      >
        <Sparkles className={cn(iconSizes[size], "text-helpconfort-blue drop-shadow-lg")} />
      </motion.div>
    </div>
  );
}
