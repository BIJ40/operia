/**
 * DossierInactifDialog — Actions pour les dossiers inactifs
 * Annuler / Relancer / Donner une info
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
import { Label } from '@/components/ui/label';
import { Ban, RefreshCw, MessageSquare, Loader2, Send } from 'lucide-react';
import { useApporteurDossierActions, type InactifAction } from '../../hooks/useApporteurDossierActions';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierRef: string;
}

const ACTIONS: { value: InactifAction; label: string; icon: typeof Ban; desc: string; color: string }[] = [
  {
    value: 'annuler',
    label: 'Annuler',
    icon: Ban,
    desc: 'Demander l\'annulation du dossier',
    color: 'border-[hsl(var(--ap-danger)/.4)] hover:bg-[hsl(var(--ap-danger-light))] data-[selected=true]:bg-[hsl(var(--ap-danger-light))] data-[selected=true]:border-[hsl(var(--ap-danger))]',
  },
  {
    value: 'relancer',
    label: 'Relancer',
    icon: RefreshCw,
    desc: 'Demander une relance sur ce dossier',
    color: 'border-primary/30 hover:bg-primary/5 data-[selected=true]:bg-primary/10 data-[selected=true]:border-primary',
  },
  {
    value: 'donner_info',
    label: 'Donner une info',
    icon: MessageSquare,
    desc: 'Transmettre une information à l\'agence',
    color: 'border-secondary/30 hover:bg-secondary/5 data-[selected=true]:bg-secondary/10 data-[selected=true]:border-secondary',
  },
];

export function DossierInactifDialog({ open, onOpenChange, dossierRef }: Props) {
  const [selectedAction, setSelectedAction] = useState<InactifAction | null>(null);
  const [message, setMessage] = useState('');
  const action = useApporteurDossierActions();

  const requiresMessage = selectedAction === 'donner_info';
  const canSubmit = selectedAction && (!requiresMessage || message.trim().length > 0);

  const handleSubmit = () => {
    if (!selectedAction) return;

    action.mutate(
      {
        action: 'dossier_inactif',
        dossierRefs: [dossierRef],
        inactifAction: selectedAction,
        message: message.trim() || undefined,
      },
      {
        onSuccess: () => {
          setSelectedAction(null);
          setMessage('');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Action sur dossier inactif</DialogTitle>
          <DialogDescription>
            Dossier {dossierRef} — Que souhaitez-vous faire ?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action selection */}
          <div className="space-y-2">
            {ACTIONS.map(a => {
              const Icon = a.icon;
              return (
                <button
                  key={a.value}
                  data-selected={selectedAction === a.value}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors cursor-pointer',
                    a.color
                  )}
                  onClick={() => setSelectedAction(a.value)}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="font-medium text-sm">{a.label}</div>
                    <div className="text-xs text-muted-foreground">{a.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Message */}
          {selectedAction && (
            <div className="space-y-2">
              <Label>
                Message {requiresMessage ? '' : '(optionnel)'}
              </Label>
              <Textarea
                placeholder={
                  selectedAction === 'annuler'
                    ? 'Raison de l\'annulation...'
                    : selectedAction === 'relancer'
                    ? 'Précisions pour la relance...'
                    : 'Votre message...'
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || action.isPending}
          >
            {action.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
