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

interface SupportTicketDialogProps {
  showCloseConfirm: boolean;
  ticketRating: number;
  ticketComment: string;
  onRatingChange: (rating: number) => void;
  onCommentChange: (comment: string) => void;
  onConfirmClose: () => void;
  onCancel: () => void;
}

export function SupportTicketDialog({
  showCloseConfirm,
  ticketRating,
  ticketComment,
  onRatingChange,
  onCommentChange,
  onConfirmClose,
  onCancel,
}: SupportTicketDialogProps) {
  return (
    <AlertDialog open={showCloseConfirm} onOpenChange={onCancel}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Fermer la conversation</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-2">
            <p>
              Voulez-vous vraiment fermer cette conversation ? Le ticket sera marqué comme
              résolu.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <p className="text-sm font-medium mb-2 text-foreground">
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
                <p className="text-sm font-medium mb-2 text-foreground">
                  Commentaire (optionnel)
                </p>
                <Textarea
                  value={ticketComment}
                  onChange={(e) => onCommentChange(e.target.value)}
                  placeholder="Partagez votre avis sur cette assistance..."
                  className="min-h-[80px] resize-none"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmClose}>
            Confirmer et fermer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
