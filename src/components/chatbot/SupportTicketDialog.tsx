import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RatingStars } from '@/components/RatingStars';
import { Minimize2, Ticket, CheckCircle2 } from 'lucide-react';

interface SupportTicketDialogProps {
  showCloseConfirm: boolean;
  ticketRating: number;
  ticketComment: string;
  onRatingChange: (rating: number) => void;
  onCommentChange: (comment: string) => void;
  onConfirmClose: () => void;
  onCancel: () => void;
  onMinimize?: () => void;
  onConvertToTicket?: () => void;
}

export function SupportTicketDialog({
  showCloseConfirm,
  ticketRating,
  ticketComment,
  onRatingChange,
  onCommentChange,
  onConfirmClose,
  onCancel,
  onMinimize,
  onConvertToTicket,
}: SupportTicketDialogProps) {
  return (
    <AlertDialog open={showCloseConfirm} onOpenChange={onCancel}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Que souhaitez-vous faire ?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Choisissez comment gérer votre conversation en cours.
            </p>

            {/* Option 1: Minimize */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => {
                onMinimize?.();
                onCancel();
              }}
            >
              <Minimize2 className="h-5 w-5 text-blue-500 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Réduire</div>
                <div className="text-xs text-muted-foreground">
                  Fermer la fenêtre, la conversation reste active
                </div>
              </div>
            </Button>

            {/* Option 2: Convert to ticket */}
            {onConvertToTicket && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => {
                  onConvertToTicket();
                  onCancel();
                }}
              >
                <Ticket className="h-5 w-5 text-purple-500 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">Transformer en ticket</div>
                  <div className="text-xs text-muted-foreground">
                    Créer un ticket suivi dans "Mes demandes"
                  </div>
                </div>
              </Button>
            )}

            {/* Separator */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Résoudre et clôturer</p>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Comment évaluez-vous votre expérience ?
                  </p>
                  <div className="flex justify-center">
                    <RatingStars
                      rating={ticketRating}
                      onRatingChange={onRatingChange}
                      size="lg"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Commentaire (optionnel)
                  </p>
                  <Textarea
                    value={ticketComment}
                    onChange={(e) => onCommentChange(e.target.value)}
                    placeholder="Partagez votre avis sur cette assistance..."
                    className="min-h-[60px] resize-none"
                  />
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onCancel}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmClose} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Résoudre et fermer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
