/**
 * FloatingChatButton.tsx
 * Bouton flottant en bas à droite pour ouvrir le chatbot
 */

import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatModal } from '@/components/unified-search/ChatModal';
import { cn } from '@/lib/utils';

export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Bouton flottant */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "h-14 w-14 rounded-full shadow-lg",
          "bg-helpconfort-blue hover:bg-helpconfort-blue/90",
          "transition-all duration-200 hover:scale-105",
          isOpen && "scale-0 opacity-0"
        )}
        size="icon"
        aria-label="Ouvrir l'assistant"
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </Button>

      {/* Modal de chat */}
      <ChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
