/**
 * ChatModal.tsx
 * Modal conversationnelle qui remplace la recherche simple
 * Réutilise SupportChatCore pour avoir un vrai chat IA
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SupportChatCore } from '@/components/support/SupportChatCore';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveSupportContext } from '@/contexts/LiveSupportContext';
import { getFilteredContexts } from '@/lib/rag-michu';
import { Sparkles, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const { globalRole } = useAuth();
  const { startNewSession, openChat } = useLiveSupportContext();
  const allowedContexts = getFilteredContexts(globalRole || 'base_user');

  const handleTalkToHuman = async () => {
    // Fermer la modale IA AVANT de démarrer la session live
    // pour éviter un conflit entre les deux dialogs
    onClose();
    // Petit délai pour laisser la modale se fermer proprement
    setTimeout(async () => {
      await startNewSession();
    }, 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b bg-gradient-to-r from-helpconfort-blue/10 to-transparent flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-helpconfort-blue" />
            Assistant IA HelpConfort
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTalkToHuman}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <MessageCircle className="w-4 h-4" />
            Parler à un humain
          </Button>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <SupportChatCore
            initialContext={allowedContexts[0] || 'apogee'}
            showFAQSuggestions={true}
            maxFAQSuggestions={3}
            className="h-full"
            onTicketCreated={() => {
              onClose();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
