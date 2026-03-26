/**
 * BankConnectionSheet — Real Bridge Connect flow
 * 
 * Flow:
 * 1. User names connection
 * 2. Backend creates Bridge user + Connect session
 * 3. User is redirected to Bridge Connect
 * 4. On return, callback finalizes + triggers sync
 */

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Landmark, Shield, ArrowRight, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { useCreateBankConnection } from '@/apogee-connect/hooks/useTreasury';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'info' | 'name' | 'connecting' | 'redirect' | 'error';

export function BankConnectionSheet({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>('info');
  const [displayName, setDisplayName] = useState('');
  const [bridgeUrl, setBridgeUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const createConnection = useCreateBankConnection();

  const handleCreate = async () => {
    if (!displayName.trim()) return;
    setStep('connecting');
    setErrorMsg(null);
    try {
      const result = await createConnection.mutateAsync({ displayName: displayName.trim() });
      if (result?.bridgeConnectUrl) {
        setBridgeUrl(result.bridgeConnectUrl);
        setStep('redirect');
      } else {
        // Fallback: connection created but no Bridge URL (config missing?)
        setErrorMsg("La session Bridge n'a pas pu être créée. Vérifiez la configuration.");
        setStep('error');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création';
      setErrorMsg(msg);
      setStep('error');
      toast.error(msg);
    }
  };

  const handleRedirect = () => {
    if (bridgeUrl) {
      window.open(bridgeUrl, '_blank', 'noopener,noreferrer');
      toast.info('Finalisez la connexion dans l\'onglet Bridge, puis revenez ici.');
      handleClose();
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('info');
      setDisplayName('');
      setBridgeUrl(null);
      setErrorMsg(null);
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
            Connectez votre compte bancaire via Bridge pour le suivi de trésorerie en temps réel.
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
                    Vous nommez votre connexion bancaire
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-foreground shrink-0">2.</span>
                    Vous êtes redirigé vers Bridge pour autoriser l'accès
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-foreground shrink-0">3.</span>
                    Vos comptes et transactions sont synchronisés automatiquement
                  </li>
                </ul>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>Connexion sécurisée · Données chiffrées · Accès en lecture seule</span>
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

              <Button className="w-full gap-2" onClick={handleCreate} disabled={!displayName.trim() || displayName.trim().length < 2}>
                Connecter via Bridge
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 'connecting' && (
            <div className="flex flex-col items-center py-10 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm font-medium">Création de la session Bridge...</p>
              <p className="text-xs text-muted-foreground/70">Préparation de la redirection bancaire</p>
            </div>
          )}

          {step === 'redirect' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <ExternalLink className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Session Bridge prête</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Cliquez pour ouvrir Bridge Connect et autoriser l'accès à vos comptes bancaires.
                </p>
              </div>
              <Button className="w-full gap-2" onClick={handleRedirect}>
                Ouvrir Bridge Connect
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Annuler
              </Button>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Erreur de connexion</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {errorMsg ?? "Une erreur est survenue lors de la création de la session."}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('name')}>
                  Réessayer
                </Button>
                <Button variant="ghost" onClick={handleClose}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
