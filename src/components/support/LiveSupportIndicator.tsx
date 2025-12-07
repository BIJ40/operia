/**
 * Indicateur de session de support en direct active
 * Affiché dans le header quand une conversation est en cours
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Radio, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLiveSupportSession } from '@/hooks/useLiveSupportSession';

interface LiveSupportIndicatorProps {
  onClick: () => void;
  onClose?: () => void;
  className?: string;
}

export function LiveSupportIndicator({ onClick, onClose, className }: LiveSupportIndicatorProps) {
  const { hasActiveSession, isWaiting, isConnected, closeSession } = useLiveSupportSession();

  if (!hasActiveSession) return null;

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await closeSession();
    onClose?.();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={cn("relative", className)}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          className={cn(
            "relative gap-2 px-3 h-9 rounded-full",
            "bg-gradient-to-r",
            isConnected 
              ? "from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/30"
              : "from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/30"
          )}
        >
          {/* Pulsing indicator */}
          <span className="relative flex h-2.5 w-2.5">
            <span className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              isConnected ? "bg-green-400" : "bg-amber-400"
            )} />
            <span className={cn(
              "relative inline-flex rounded-full h-2.5 w-2.5",
              isConnected ? "bg-green-500" : "bg-amber-500"
            )} />
          </span>

          <MessageCircle className="h-4 w-4" />
          
          <span className="text-xs font-medium">
            {isConnected ? 'En direct' : 'En attente...'}
          </span>

          {/* Close button */}
          <button
            onClick={handleClose}
            className={cn(
              "ml-1 p-0.5 rounded-full hover:bg-background/50 transition-colors",
              isConnected ? "text-green-600" : "text-amber-600"
            )}
          >
            <X className="h-3 w-3" />
          </button>
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
