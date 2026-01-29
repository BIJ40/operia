/**
 * PreloadMinimizedIndicator - Indicateur discret quand popup réduite
 */

import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useDataPreload } from '@/contexts/DataPreloadContext';

export function PreloadMinimizedIndicator() {
  const { 
    isVisible, 
    isMinimized, 
    progress, 
    isDegraded, 
    error, 
    maximize 
  } = useDataPreload();
  
  // Ne montrer que si visible et minimisé
  if (!isVisible || !isMinimized) return null;
  
  const isComplete = progress >= 100;
  const hasError = !!error;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: 50 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.8, x: 50 }}
      className="fixed bottom-4 right-4 z-50"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={maximize}
        className={cn(
          'shadow-lg backdrop-blur-sm gap-2 pr-3',
          'border-warm-blue/30 bg-background/95 hover:bg-background',
          hasError && 'border-warm-orange/50',
          isDegraded && 'border-warm-orange/30',
          isComplete && 'border-warm-green/50'
        )}
      >
        {hasError ? (
          <AlertTriangle className="h-4 w-4 text-warm-orange animate-pulse" />
        ) : isComplete ? (
          <CheckCircle className="h-4 w-4 text-warm-green" />
        ) : (
          <Loader2 className="h-4 w-4 text-warm-blue animate-spin" />
        )}
        
        <span className="text-sm font-medium">
          {hasError ? 'Erreur' : isComplete ? 'Terminé' : `${progress}%`}
        </span>
        
        {/* Mini barre de progression */}
        {!isComplete && !hasError && (
          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-warm-blue rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut' }}
            />
          </div>
        )}
      </Button>
    </motion.div>
  );
}
