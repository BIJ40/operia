/**
 * ChatModal.tsx
 * Modal conversationnelle simplifiée V3
 * Flux: Questions d'orientation → RAG → Proposition ticket
 * Plus de Live Support
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SimplifiedSupportChat } from '@/components/support/SimplifiedSupportChat';
import { Sparkles } from 'lucide-react';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatModal({ isOpen, onClose }: ChatModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b bg-gradient-to-r from-helpconfort-blue/10 to-transparent">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-helpconfort-blue" />
            Aide en Direct
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <SimplifiedSupportChat
            onTicketCreated={() => onClose()}
            onChatClosed={() => onClose()}
            className="h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
