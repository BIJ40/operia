/**
 * GlobalLiveSupportManager - Gère l'indicateur et le dialog de chat live globalement
 * Ce composant est placé dans le layout principal pour être accessible partout
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageCircle } from 'lucide-react';
import { useLiveSupportSession } from '@/hooks/useLiveSupportSession';
import { LiveSupportChat } from './LiveSupportChat';
import { LiveSupportIndicator } from './LiveSupportIndicator';

export function GlobalLiveSupportManager() {
  const { 
    hasActiveSession, 
    showChatDialog, 
    openChat, 
    closeChatDialog,
    closeSession,
  } = useLiveSupportSession();

  // Ne rien afficher si pas de session active
  if (!hasActiveSession) return null;

  return (
    <>
      {/* Indicateur flottant dans le header - géré par UnifiedHeader */}
      
      {/* Dialog de chat - accessible de partout */}
      <Dialog open={showChatDialog} onOpenChange={(open) => !open && closeChatDialog()}>
        <DialogContent className="sm:max-w-xl h-[70vh] p-0 flex flex-col">
          <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-500" />
              Support en direct
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <LiveSupportChat
              onClose={() => {
                closeSession();
                closeChatDialog();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
