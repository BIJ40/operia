/**
 * ValiderDevisDialog — Confirmer la validation d'un ou plusieurs devis
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
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useApporteurDossierActions } from '../../hooks/useApporteurDossierActions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierRefs: string[];
}

export function ValiderDevisDialog({ open, onOpenChange, dossierRefs }: Props) {
  const [message, setMessage] = useState('');
  const action = useApporteurDossierActions();

  const handleSubmit = () => {
    action.mutate(
      {
        action: 'valider_devis',
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
          <DialogTitle className="flex items-center gap-2 text-[hsl(var(--ap-success))]">
            <CheckCircle2 className="w-5 h-5" />
            {isBulk ? `Valider ${dossierRefs.length} devis` : 'Valider le devis'}
          </DialogTitle>
          <DialogDescription>
            {isBulk
              ? `Vous allez valider les devis des dossiers : ${dossierRefs.join(', ')}`
              : `Vous allez valider le devis du dossier ${dossierRefs[0]}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="text-sm text-muted-foreground">
            Commentaire (optionnel)
          </label>
          <Textarea
            placeholder="Commentaire éventuel..."
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
            onClick={handleSubmit}
            disabled={action.isPending}
            className="gap-2 bg-[hsl(var(--ap-success))] hover:bg-[hsl(var(--ap-success)/.85)] text-white"
          >
            {action.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Confirmer la validation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
