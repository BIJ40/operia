/**
 * Barre de recherche flottante unifiée
 * Position: sous le header, au niveau de la page
 * Ouvre un modal conversationnel (ChatModal) au clic
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useUnifiedSearchAnimation } from './useUnifiedSearchAnimation';
import { GlowDecorator, OrbitDecorator, WaveDotsDecorator, NeonRingDecorator, PulseRingsDecorator } from './AnimationDecorators';
import { ChatModal } from './ChatModal';
import { cn } from '@/lib/utils';

export function UnifiedSearchFloatingBar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const animation = useUnifiedSearchAnimation();

  // Keyboard shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsModalOpen(prev => !prev);
      }
      // Escape to close
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  return (
    <>
      <div className="w-full flex justify-center py-3">
        <div className="relative flex items-center justify-center" style={{ padding: '24px' }}>
          {/* Décorateurs d'animation - ordre z-index */}
          {animation.decorators?.showGlow && (
            <GlowDecorator 
              glowColor={animation.decorators.glowColor} 
              intensity={animation.decorators.glowIntensity || 'medium'}
            />
          )}
          {animation.decorators?.showPulseRings && (
            <PulseRingsDecorator glowColor={animation.decorators.glowColor} />
          )}
          {animation.decorators?.showNeonRing && (
            <NeonRingDecorator glowColor={animation.decorators.glowColor} />
          )}
          {animation.decorators?.showOrbit && (
            <OrbitDecorator glowColor={animation.decorators.glowColor} />
          )}
          {animation.decorators?.showWaveDots && (
            <WaveDotsDecorator glowColor={animation.decorators.glowColor} />
          )}
          
          {/* Bouton principal avec animation Framer Motion */}
          <motion.button
            onClick={() => setIsModalOpen(true)}
            className={cn(
              "relative z-10 flex items-center gap-2 px-5 h-11 rounded-full",
              "bg-gradient-to-r from-helpconfort-blue/20 to-helpconfort-blue/30",
              "border-2 border-helpconfort-blue/40",
              "hover:border-helpconfort-blue/60",
              "hover:bg-gradient-to-r hover:from-helpconfort-blue/30 hover:to-helpconfort-blue/40",
              "shadow-lg shadow-helpconfort-blue/20",
              "transition-colors duration-200"
            )}
            initial={animation.buttonMotion.initial as any}
            animate={animation.buttonMotion.animate as any}
            transition={animation.buttonMotion.transition as any}
            whileHover={animation.buttonMotion.whileHover as any}
            whileTap={animation.buttonMotion.whileTap as any}
          >
            <Sparkles className="w-5 h-5 text-helpconfort-blue drop-shadow" />
            <span className="text-sm font-medium text-foreground">
              Assistant IA...
            </span>
            <kbd className="hidden sm:inline-flex ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-muted/80 rounded border border-border/50">
              ⌘K
            </kbd>
          </motion.button>
        </div>
      </div>

      {/* Modal conversationnel */}
      <ChatModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
