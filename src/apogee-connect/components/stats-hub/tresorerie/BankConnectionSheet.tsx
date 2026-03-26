/**
 * BankConnectionSheet — Flow de connexion bancaire
 */

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Landmark, Shield, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useCreateBankConnection } from '@/apogee-connect/hooks/useTreasury';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'info' | 'name' | 'connecting' | 'done';

export function BankConnectionSheet({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>('info');
  const [displayName, setDisplayName] = useState('');
  const createConnection = useCreateBankConnection();

  const handleCreate = async () => {
    if (!displayName.trim()) return;
    setStep('connecting');
    try {
      await createConnection.mutateAsync({ displayName: displayName.trim() });
      setStep('done');
      toast.success('Connexion bancaire créée');
    } catch {
      toast.error('Erreur lors de la création');
      setStep('name');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('info');
      setDisplayName('');
    }, 300);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Connecter une banque
          </SheetTitle>
          <SheetDescription>
            Ajoutez une connexion bancaire pour suivre votre trésorerie en temps réel.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {step === 'info' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
                <h4 className="text-sm font-semibold">Comment ça fonctionne</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-foreground shrink-0">1.</span>
                    Vous nommez votre connexion
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-foreground shrink-0">2.</span>
                    Vous êtes redirigé vers votre banque pour autoriser l'accès
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-foreground shrink-0">3.</span>
                    Vos comptes et transactions sont synchronisés automatiquement
                  </li>
                </ul>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>Connexion sécurisée · Vos données restent privées · Accès en lecture seule</span>
              </div>

              <Button className="w-full gap-2" onClick={() => setStep('name')}>
                Continuer
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 'name' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="conn-name">Nom de la connexion</Label>
                <Input
                  id="conn-name"
                  placeholder="Ex: Banque principale, Compte pro..."
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Ce nom vous aide à identifier cette connexion parmi plusieurs.
                </p>
              </div>

              <Button className="w-full gap-2" onClick={handleCreate} disabled={!displayName.trim()}>
                Créer la connexion
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 'connecting' && (
            <div className="flex flex-col items-center py-10 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm font-medium">Création en cours...</p>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center py-10 gap-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-medium">Connexion créée avec succès</p>
              <p className="text-xs text-muted-foreground text-center">
                La connexion est en attente. L'intégration avec le provider bancaire sera activée prochainement.
              </p>
              <Button variant="outline" onClick={handleClose} className="mt-2">
                Fermer
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
