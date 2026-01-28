/**
 * SidebarChat.tsx
 * Panneau latéral droit accroché pour le chatbot
 * Peut être déplié (ouvert) ou plié (réduit à un onglet)
 */

import { useState } from 'react';
import { MessageCircle, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SimplifiedSupportChat } from '@/components/support/SimplifiedSupportChat';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function SidebarChat() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Panneau latéral */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "fixed top-0 right-0 z-50 h-full",
              "w-[400px] max-w-[90vw]",
              "bg-background border-l shadow-2xl",
              "flex flex-col"
            )}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b bg-gradient-to-r from-helpconfort-blue/10 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-helpconfort-blue" />
                <span className="font-semibold text-sm">Aide en Direct</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Chat content */}
            <div className="flex-1 overflow-hidden">
              <SimplifiedSupportChat
                onTicketCreated={() => setIsOpen(false)}
                onChatClosed={() => setIsOpen(false)}
                className="h-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onglet accroché sur le côté - visible quand fermé */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed right-0 top-1/2 -translate-y-1/2 z-50",
          "flex items-center gap-2",
          "bg-helpconfort-blue text-white",
          "px-2 py-4 rounded-l-xl",
          "shadow-lg hover:shadow-xl",
          "transition-all duration-200",
          "hover:px-3",
          "group",
          isOpen && "opacity-0 pointer-events-none"
        )}
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        aria-label={isOpen ? "Fermer l'assistant" : "Ouvrir l'assistant"}
      >
        <MessageCircle className="h-5 w-5 rotate-90" />
        <span className="text-sm font-medium tracking-wide">Aide</span>
        <ChevronLeft className="h-4 w-4 rotate-90 group-hover:translate-x-0.5 transition-transform" />
      </motion.button>

      {/* Overlay pour fermer en cliquant à l'extérieur */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>
    </>
  );
}
