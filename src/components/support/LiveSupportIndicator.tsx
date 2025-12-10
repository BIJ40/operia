/**
 * LiveSupportIndicator - Badge animé dans le header
 * Affiche l'état du chat en direct et permet de l'ouvrir
 */

import { motion } from 'framer-motion';
import { MessageCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLiveSupportContext } from '@/contexts/LiveSupportContext';
import { cn } from '@/lib/utils';
import { logDebug } from '@/lib/logger';

interface LiveSupportIndicatorProps {
  className?: string;
}

export function LiveSupportIndicator({ className }: LiveSupportIndicatorProps) {
  const { 
    hasActiveSession, 
    isWaiting, 
    isConnected, 
    openChat, 
    closeSession 
  } = useLiveSupportContext();

  if (!hasActiveSession) return null;

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeSession();
  };

  const handleOpenChat = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    logDebug('[LiveSupportIndicator] Opening chat, hasActiveSession:', hasActiveSession);
    if (hasActiveSession) {
      openChat();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.8, x: 20 }}
      className={cn("flex items-center", className)}
    >
      <Button
        onClick={handleOpenChat}
        size="sm"
        className={cn(
          "relative gap-2 rounded-full px-4 shadow-lg transition-all",
          isConnected 
            ? "bg-green-500 hover:bg-green-600 text-white" 
            : "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
        )}
      >
        {/* Pulse indicator */}
        <span className="relative flex h-2 w-2">
          <span className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            isConnected ? "bg-green-300" : "bg-amber-300"
          )} />
          <span className={cn(
            "relative inline-flex rounded-full h-2 w-2",
            isConnected ? "bg-green-200" : "bg-amber-200"
          )} />
        </span>
        
        {isWaiting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MessageCircle className="w-4 h-4" />
        )}
        
        <span className="text-xs font-medium hidden sm:inline">
          {isConnected ? 'En direct' : 'En attente...'}
        </span>

        {/* Close button */}
        <span
          role="button"
          onClick={handleClose}
          className="ml-1 p-0.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
          title="Terminer la conversation"
        >
          <X className="w-3 h-3" />
        </span>
      </Button>
    </motion.div>
  );
}
