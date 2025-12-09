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
      <div className="w-full flex justify-center py-2">
        <div className="relative flex items-center justify-center">
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
          
          {/* Bouton compact style barre de recherche */}
          <motion.button
            onClick={() => setIsModalOpen(true)}
            className={cn(
              "relative z-10 flex items-center gap-2 px-4 h-9 rounded-full",
              "bg-background/95 backdrop-blur-sm",
              "border border-border/60 hover:border-helpconfort-blue/50",
              "shadow-sm hover:shadow-md hover:shadow-helpconfort-blue/10",
              "transition-all duration-200 cursor-text"
            )}
            initial={animation.buttonMotion.initial as any}
            animate={animation.buttonMotion.animate as any}
            transition={animation.buttonMotion.transition as any}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Sparkles className="w-4 h-4 text-helpconfort-blue" />
            <span className="text-sm text-muted-foreground">
              Posez votre question...
            </span>
            <kbd className="hidden sm:inline-flex ml-auto px-1.5 py-0.5 text-[10px] font-mono bg-muted/80 rounded border border-border/50 text-muted-foreground">
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
