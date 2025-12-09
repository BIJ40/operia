/**
 * ChatModal.tsx
 * Modal conversationnelle qui remplace la recherche simple
 * Intègre le chat IA ET le chat live dans la même modale
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SupportChatCore } from '@/components/support/SupportChatCore';
import { LiveSupportChat } from '@/components/support/LiveSupportChat';
import { useAuth } from '@/contexts/AuthContext';
import { getFilteredContexts } from '@/lib/rag-michu';
import { Sparkles, MessageCircle, ArrowLeft, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ChatMode = 'ai' | 'live';

export function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const { globalRole } = useAuth();
  const [mode, setMode] = useState<ChatMode>('ai');
  const allowedContexts = getFilteredContexts(globalRole || 'base_user');

  const handleTalkToHuman = () => {
    // Basculer vers le mode live sans fermer la modale
    setMode('live');
  };

  const handleBackToAI = () => {
    setMode('ai');
  };

  const handleClose = () => {
    // Reset le mode à AI quand on ferme
    setMode('ai');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b bg-gradient-to-r from-helpconfort-blue/10 to-transparent flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-base">
            {mode === 'ai' ? (
              <>
                <Sparkles className="w-5 h-5 text-helpconfort-blue" />
                Assistant IA HelpConfort
              </>
            ) : (
              <>
                <Headphones className="w-5 h-5 text-green-500" />
                Support en direct
              </>
            )}
          </DialogTitle>
          
          {mode === 'ai' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTalkToHuman}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <MessageCircle className="w-4 h-4" />
              Parler à un humain
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToAI}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à l'IA
            </Button>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {mode === 'ai' ? (
            <SupportChatCore
              initialContext={allowedContexts[0] || 'apogee'}
              showFAQSuggestions={true}
              maxFAQSuggestions={3}
              className="h-full"
              onTicketCreated={() => {
                handleClose();
              }}
            />
          ) : (
            <LiveSupportChat 
              onClose={handleClose}
              className="h-full"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
