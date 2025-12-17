/**
 * ChatModal.tsx
 * Modal conversationnelle qui remplace la recherche simple
 * Intègre le chat IA ET le chat live dans la même modale
 * Utilise LiveSupportContext pour gérer la session live
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SupportChatCore } from '@/components/support/SupportChatCore';
import { LiveSupportChat } from '@/components/support/LiveSupportChat';
import { LiveChatCloseDialog } from './LiveChatCloseDialog';
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
  const { hasActiveSession, activeSession, startNewSession, clearSession } = useLiveSupportContext();
  const allowedContexts = getFilteredContexts(globalRole || 'base_user');
  
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  // Si session live active, afficher le chat live automatiquement
  const showLiveChat = hasActiveSession;

  const handleTalkToHuman = async () => {
    // Démarrer une nouvelle session live (le contexte gère tout)
    await startNewSession();
  };

  const handleEndChat = () => {
    // Ouvrir le dialog de confirmation au lieu de fermer directement
    setShowCloseDialog(true);
  };

  const handleSessionClosed = () => {
    // Après fermeture de la session, clear le contexte local
    clearSession();
  };

  const handleClose = () => {
    // Si session live active, demander confirmation
    if (hasActiveSession) {
      setShowCloseDialog(true);
      return;
    }
    // Sinon fermer directement la modale
    onClose();
  };

  return (
    <>
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
                  Aide en Direct
                </>
              )}
            </DialogTitle>
            
            {showLiveChat ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEndChat}
                className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Terminer le chat
              </Button>
            ) : null}
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
                  onClose();
                }}
                onRequestHuman={handleTalkToHuman}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de fermeture */}
      {activeSession && (
        <LiveChatCloseDialog
          open={showCloseDialog}
          onOpenChange={setShowCloseDialog}
          sessionId={activeSession.id}
          onClosed={handleSessionClosed}
        />
      )}
    </>
  );
}
