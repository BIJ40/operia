/**
 * GlobalLiveSupportManager - Gère l'indicateur et le dialog de chat live globalement
 * Ce composant est placé dans le layout principal pour être accessible partout
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MessageCircle } from 'lucide-react';
import { useLiveSupportSession } from '@/hooks/useLiveSupportSession';
import { LiveSupportChat } from './LiveSupportChat';

export function GlobalLiveSupportManager() {
  const { 
    hasActiveSession, 
    showChatDialog, 
    closeChatDialog,
    closeSession,
  } = useLiveSupportSession();

  // Ne rien afficher si pas de session active
  if (!hasActiveSession) return null;

  return (
    <>
      {/* Dialog de chat - accessible de partout */}
      <Dialog open={showChatDialog} onOpenChange={(open) => !open && closeChatDialog()}>
        <DialogContent 
          className="sm:max-w-xl h-[70vh] p-0 flex flex-col"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-500" />
              Support en direct
            </DialogTitle>
            <DialogDescription className="sr-only">
              Conversation en direct avec le support HelpConfort
            </DialogDescription>
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
