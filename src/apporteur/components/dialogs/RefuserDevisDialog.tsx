/**
 * RefuserDevisDialog — Confirmer le refus d'un ou plusieurs devis
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { XCircle, Loader2 } from 'lucide-react';
import { useApporteurDossierActions } from '../../hooks/useApporteurDossierActions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierRefs: string[];
}

export function RefuserDevisDialog({ open, onOpenChange, dossierRefs }: Props) {
  const [message, setMessage] = useState('');
  const action = useApporteurDossierActions();

  const handleSubmit = () => {
    action.mutate(
      {
        action: 'refuser_devis',
        dossierRefs,
        message: message.trim() || undefined,
      },
      {
        onSuccess: () => {
          setMessage('');
          onOpenChange(false);
        },
      }
    );
  };

  const isBulk = dossierRefs.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[hsl(var(--ap-danger))]">
            <XCircle className="w-5 h-5" />
            {isBulk ? `Refuser ${dossierRefs.length} devis` : 'Refuser le devis'}
          </DialogTitle>
          <DialogDescription>
            {isBulk
              ? `Vous allez refuser les devis des dossiers : ${dossierRefs.join(', ')}`
              : `Vous allez refuser le devis du dossier ${dossierRefs[0]}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="text-sm text-muted-foreground">
            Commentaire (optionnel)
          </label>
          <Textarea
            placeholder="Raison du refus..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={action.isPending}
          >
            {action.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <XCircle className="w-4 h-4 mr-2" />
            )}
            Confirmer le refus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
