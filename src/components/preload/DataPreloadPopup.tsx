/**
 * DataPreloadPopup - Popup de préchargement des données
 * 
 * Thème "warm-blue" avec:
 * - Barre de progression animée
 * - Liste des étapes avec statuts
 * - Messages d'attente dynamiques
 * - Astuces contextuelles
 * - Mode non-bloquant (réduire) / bloquant (erreur)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minimize2, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useDataPreload } from '@/contexts/DataPreloadContext';
import { PreloadStepsList } from './PreloadStepsList';
import { PreloadTipsCarousel } from './PreloadTipsCarousel';
import { PreloadMinimizedIndicator } from './PreloadMinimizedIndicator';

// Messages d'attente dynamiques
const LOADING_MESSAGES = [
  'Préparation de votre espace...',
  'Synchronisation en cours...',
  'Chargement de vos données...',
  'Mise à jour des informations...',
  'Optimisation de l\'affichage...',
];

export function DataPreloadPopup() {
  const {
    isVisible,
    isMinimized,
    isPreloading,
    progress,
    steps,
    mode,
    error,
    isDegraded,
    minimize,
    retryPreload,
    dismiss,
  } = useDataPreload();
  
  const [messageIndex, setMessageIndex] = useState(0);
  
  // Rotation des messages d'attente
  useEffect(() => {
    if (!isPreloading || progress >= 100) return;
    
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isPreloading, progress]);
  
  // Afficher l'indicateur minimisé si réduit
  if (isMinimized) {
    return <PreloadMinimizedIndicator />;
  }
  
  // Ne rien afficher si non visible
  if (!isVisible) return null;
  
  const isComplete = progress >= 100 && !error;
  const isBlocking = mode === 'blocking';
  
  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'fixed inset-0 z-50',
            isBlocking 
              ? 'bg-background/80 backdrop-blur-sm' 
              : 'bg-background/60 backdrop-blur-[2px]'
          )}
          onClick={!isBlocking ? dismiss : undefined}
        />
      </AnimatePresence>
      
      {/* Popup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
          'w-[90vw] max-w-md',
          'bg-card/95 backdrop-blur-md rounded-2xl shadow-2xl',
          'border border-border/50',
          'overflow-hidden'
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Header avec dégradé warm-blue */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-warm-blue/10 via-warm-blue/5 to-transparent">
          {/* Bouton réduire/fermer */}
          {!isBlocking && (
            <Button
              variant="ghost"
              size="icon"
              onClick={minimize}
              className="absolute top-3 right-3 h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          )}
          
          {/* Logo/Icon animé */}
          <motion.div
            animate={isComplete ? { scale: [1, 1.1, 1] } : { rotate: 360 }}
            transition={isComplete 
              ? { duration: 0.3 } 
              : { duration: 2, repeat: Infinity, ease: 'linear' }
            }
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
              'bg-gradient-to-br from-warm-blue to-warm-blue/80',
              'shadow-lg shadow-warm-blue/20'
            )}
          >
            {error ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <svg 
                viewBox="0 0 24 24" 
                className="h-6 w-6 text-white" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              </svg>
            )}
          </motion.div>
          
          {/* Message dynamique */}
          <AnimatePresence mode="wait">
            <motion.h2
              key={error ? 'error' : isComplete ? 'complete' : messageIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-lg font-semibold text-foreground"
            >
              {error 
                ? 'Erreur de synchronisation' 
                : isComplete 
                  ? (isDegraded ? 'Synchronisation partielle' : 'Synchronisation terminée')
                  : LOADING_MESSAGES[messageIndex]
              }
            </motion.h2>
          </AnimatePresence>
          
          {error && (
            <p className="text-sm text-muted-foreground mt-1">
              {error}
            </p>
          )}
        </div>
        
        {/* Contenu */}
        <div className="px-6 py-4 space-y-4">
          {/* Barre de progression */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progression</span>
              <span className={cn(
                'font-medium',
                isComplete ? 'text-warm-green' : 'text-warm-blue'
              )}>
                {progress}%
              </span>
            </div>
            <Progress 
              value={progress} 
              className="h-2"
              indicatorClassName={cn(
                'transition-all duration-300',
                error ? 'bg-warm-orange' : isComplete ? 'bg-warm-green' : 'bg-warm-blue'
              )}
            />
          </div>
          
          {/* Liste des étapes */}
          <PreloadStepsList 
            steps={steps} 
            className="max-h-[200px] overflow-y-auto scrollbar-thin"
          />
          
          {/* Astuces (seulement pendant le chargement) */}
          {!error && !isComplete && (
            <PreloadTipsCarousel className="mt-4" />
          )}
          
          {/* Badge mode dégradé */}
          {isDegraded && !error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warm-orange/10 border border-warm-orange/20">
              <span className="text-sm text-warm-orange">
                ⚠️ Certaines données peuvent être incomplètes
              </span>
            </div>
          )}
        </div>
        
        {/* Footer avec actions */}
        <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-2">
          {error ? (
            <Button
              onClick={retryPreload}
              className="bg-warm-blue hover:bg-warm-blue/90"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          ) : !isBlocking && !isComplete && (
            <Button
              variant="ghost"
              onClick={minimize}
              className="text-muted-foreground"
            >
              <Minimize2 className="h-4 w-4 mr-2" />
              Réduire
            </Button>
          )}
        </div>
      </motion.div>
    </>
  );
}
