/**
 * MfaEnrollDialog — TOTP enrollment flow.
 * 
 * Shows QR code + secret, then verifies a code to complete enrollment.
 */

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useMfa } from '@/hooks/useMfa';
import { toast } from 'sonner';
import { Shield, Copy, Check, Loader2, QrCode } from 'lucide-react';
import QRCodeSVG from 'react-qr-code';

interface MfaEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 'intro' | 'scan' | 'verify';

export function MfaEnrollDialog({ open, onOpenChange, onSuccess }: MfaEnrollDialogProps) {
  const { enroll, verify } = useMfa();
  const [step, setStep] = useState<Step>('intro');
  const [factorId, setFactorId] = useState('');
  const [qrUri, setQrUri] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    const result = await enroll();
    setLoading(false);

    if (!result) {
      toast.error("Impossible d'initialiser le MFA. Réessayez.");
      return;
    }

    setFactorId(result.factorId);
    setQrUri(result.qrCode);
    setSecret(result.secret);
    setStep('scan');
  };

  const handleCopySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    const result = await verify(factorId, code);
    setLoading(false);

    if (result.success) {
      toast.success('MFA activé avec succès !');
      onSuccess?.();
      onOpenChange(false);
      // Reset
      setStep('intro');
      setCode('');
    } else {
      toast.error(result.error ?? 'Code invalide');
      setCode('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Activer l'authentification à deux facteurs
          </DialogTitle>
          <DialogDescription>
            Protégez votre compte avec une application d'authentification (Google Authenticator, Authy, etc.)
          </DialogDescription>
        </DialogHeader>

        {step === 'intro' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
              <p>L'authentification à deux facteurs (MFA) ajoute une couche de sécurité supplémentaire à votre compte.</p>
              <p>Vous aurez besoin d'une application comme <strong>Google Authenticator</strong> ou <strong>Authy</strong>.</p>
            </div>
            <Button onClick={handleStart} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <QrCode className="w-4 h-4 mr-2" />}
              Commencer la configuration
            </Button>
          </div>
        )}

        {step === 'scan' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">⚠️ Important</p>
              <p>Ouvrez d'abord votre application d'authentification (Google Authenticator, Authy…), puis scannez le QR code <strong>depuis l'application</strong>.</p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Ne scannez pas avec l'appareil photo de votre téléphone.</p>
            </div>
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCodeSVG value={qrUri} size={200} />
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Ou entrez manuellement la clé secrète ci-dessous dans votre application :
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted p-2 rounded font-mono break-all">
                {secret}
              </code>
              <Button variant="outline" size="icon" onClick={handleCopySecret}>
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Button onClick={() => setStep('verify')} className="w-full">
              J'ai scanné le code →
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Entrez le code à 6 chiffres affiché dans votre application
            </p>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              onClick={handleVerify}
              disabled={code.length !== 6 || loading}
              className="w-full"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Vérifier et activer
            </Button>
            <Button variant="ghost" onClick={() => setStep('scan')} className="w-full text-sm">
              ← Retour au QR code
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
