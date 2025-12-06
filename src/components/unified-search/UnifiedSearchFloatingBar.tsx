/**
 * Barre de recherche flottante unifiée
 * Position: sous le header, au niveau de la page
 * Intègre le système d'animations configurable
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUnifiedSearch } from './UnifiedSearchContext';
import { useUnifiedSearchAnimation } from './useUnifiedSearchAnimation';
import { GlowDecorator, OrbitDecorator, WaveDotsDecorator, NeonRingDecorator } from './AnimationDecorators';
import { cn } from '@/lib/utils';

export function UnifiedSearchFloatingBar() {
  const { isOpen, isLoading, openSearch, closeSearch, submitQuery } = useUnifiedSearch();
  const [localQuery, setLocalQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const animation = useUnifiedSearchAnimation();

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          closeSearch();
        } else {
          openSearch();
        }
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        closeSearch();
        setLocalQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, openSearch, closeSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localQuery.trim() || isLoading) return;
    await submitQuery(localQuery);
    setLocalQuery('');
  };

  // Barre fermée: afficher bouton d'activation avec animation
  if (!isOpen) {
    return (
      <div className="w-full flex justify-center py-2">
        <div className="relative">
          {/* Décorateurs d'animation */}
          {animation.decorators?.showGlow && (
            <GlowDecorator glowColor={animation.decorators.glowColor} />
          )}
          {animation.decorators?.showOrbit && (
            <OrbitDecorator glowColor={animation.decorators.glowColor} />
          )}
          {animation.decorators?.showNeonRing && (
            <NeonRingDecorator glowColor={animation.decorators.glowColor} />
          )}
          {animation.decorators?.showWaveDots && (
            <WaveDotsDecorator glowColor={animation.decorators.glowColor} />
          )}
          
          {/* Bouton principal avec animation Framer Motion */}
          <motion.button
            onClick={openSearch}
            className={cn(
              "relative z-10 flex items-center gap-2 px-4 h-9 rounded-full",
              "bg-gradient-to-r from-primary/5 to-primary/10",
              "border border-primary/20",
              "hover:border-primary/40",
              "hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/20",
              "transition-colors duration-200"
            )}
            initial={animation.buttonMotion.initial as any}
            animate={animation.buttonMotion.animate as any}
            transition={animation.buttonMotion.transition as any}
            whileHover={animation.buttonMotion.whileHover as any}
            whileTap={animation.buttonMotion.whileTap as any}
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Recherche intelligente...
            </span>
            <kbd className="hidden sm:inline-flex ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">
              ⌘K
            </kbd>
          </motion.button>
        </div>
      </div>
    );
  }

  // Barre ouverte: afficher le champ de recherche
  return (
    <div className="w-full flex justify-center py-2 animate-in fade-in slide-in-from-top-2 duration-200">
      <form 
        onSubmit={handleSubmit}
        className={cn(
          "w-full max-w-2xl mx-4 flex items-center gap-2",
          "bg-background/95 backdrop-blur-sm",
          "border border-primary/30 rounded-full",
          "shadow-lg shadow-primary/5",
          "px-4 py-2"
        )}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
        ) : (
          <Search className="w-5 h-5 text-primary shrink-0" />
        )}
        
        <Input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder="Pose ta question (stats agence, docs Apogée, HelpConfort...)"
          disabled={isLoading}
          className={cn(
            "flex-1 border-0 bg-transparent",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "placeholder:text-muted-foreground/60"
          )}
        />
        
        <div className="flex items-center gap-1 shrink-0">
          {localQuery && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setLocalQuery('')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            type="submit"
            size="sm"
            disabled={!localQuery.trim() || isLoading}
            className="rounded-full px-4"
          >
            {isLoading ? 'Recherche...' : 'Rechercher'}
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              closeSearch();
              setLocalQuery('');
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
