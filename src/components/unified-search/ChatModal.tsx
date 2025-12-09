/**
 * ChatModal.tsx
 * Modal conversationnelle qui remplace la recherche simple
 * Intègre le chat IA ET le chat live dans la même modale
 * Utilise LiveSupportContext pour gérer la session live
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SupportChatCore } from '@/components/support/SupportChatCore';
import { LiveSupportChat } from '@/components/support/LiveSupportChat';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveSupportContext } from '@/contexts/LiveSupportContext';
import { getFilteredContexts } from '@/lib/rag-michu';
import { Sparkles, MessageCircle, ArrowLeft, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const { globalRole } = useAuth();
  const { hasActiveSession, startNewSession, closeSession } = useLiveSupportContext();
  const allowedContexts = getFilteredContexts(globalRole || 'base_user');

  // Si session live active, afficher le chat live automatiquement
  const showLiveChat = hasActiveSession;

  const handleTalkToHuman = async () => {
    // Démarrer une nouvelle session live (le contexte gère tout)
    await startNewSession();
  };

  const handleBackToAI = async () => {
    // Fermer la session live et revenir à l'IA
    await closeSession();
  };

  const handleClose = () => {
    // Ne pas fermer la session si elle est active - juste fermer la modale
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b bg-gradient-to-r from-helpconfort-blue/10 to-transparent flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-base">
            {showLiveChat ? (
              <>
                <Headphones className="w-5 h-5 text-green-500" />
                Support en direct
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-helpconfort-blue" />
                Assistant IA HelpConfort
              </>
            )}
          </DialogTitle>
          
          {showLiveChat ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToAI}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Terminer le chat
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTalkToHuman}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <MessageCircle className="w-4 h-4" />
              Parler à un humain
            </Button>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {showLiveChat ? (
            <LiveSupportChat 
              onClose={handleClose}
              className="h-full"
            />
          ) : (
            <SupportChatCore
              initialContext={allowedContexts[0] || 'apogee'}
              showFAQSuggestions={true}
              maxFAQSuggestions={3}
              className="h-full"
              onTicketCreated={() => {
                handleClose();
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
