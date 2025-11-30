import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Minimize2, Ticket, XCircle } from 'lucide-react';

interface ChatCloseDialogProps {
  open: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onCreateTicket: () => void;
  onEndChat: () => void;
}

export function ChatCloseDialog({
  open,
  onClose,
  onMinimize,
  onCreateTicket,
  onEndChat,
}: ChatCloseDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Que souhaitez-vous faire ?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Choisissez comment gérer votre conversation.
            </p>

            {/* Option 1: Minimize */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => {
                onMinimize();
                onClose();
              }}
            >
              <Minimize2 className="h-5 w-5 text-blue-500 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Réduire</div>
                <div className="text-xs text-muted-foreground">
                  Fermer la fenêtre, reprendre plus tard
                </div>
              </div>
            </Button>

            {/* Option 2: Create ticket */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => {
                onCreateTicket();
                onClose();
              }}
            >
              <Ticket className="h-5 w-5 text-purple-500 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Créer un ticket</div>
                <div className="text-xs text-muted-foreground">
                  Transformer en demande suivie dans "Mes demandes"
                </div>
              </div>
            </Button>

            {/* Option 3: End conversation */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 border-destructive/30 hover:bg-destructive/5"
              onClick={() => {
                onEndChat();
                onClose();
              }}
            >
              <XCircle className="h-5 w-5 text-destructive shrink-0" />
              <div className="text-left">
                <div className="font-medium">Terminer la conversation</div>
                <div className="text-xs text-muted-foreground">
                  Effacer et fermer définitivement
                </div>
              </div>
            </Button>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Annuler</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
