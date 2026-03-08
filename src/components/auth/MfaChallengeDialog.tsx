/**
 * MfaChallengeDialog — Prompts user to enter TOTP code to elevate to AAL2.
 * 
 * Shown when user has enrolled MFA but is at AAL1 and tries
 * to access a sensitive area.
 */

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useMfa } from '@/hooks/useMfa';
import { toast } from 'sonner';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface MfaChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MfaChallengeDialog({ open, onOpenChange, onSuccess }: MfaChallengeDialogProps) {
  const { factors, verify } = useMfa();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6 || factors.length === 0) return;

    setLoading(true);
    const result = await verify(factors[0].id, code);
    setLoading(false);

    if (result.success) {
      toast.success('Vérification MFA réussie');
      onSuccess?.();
      onOpenChange(false);
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
            <ShieldCheck className="w-5 h-5 text-primary" />
            Vérification de sécurité
          </DialogTitle>
          <DialogDescription>
            Cette zone nécessite une vérification supplémentaire.
            Entrez le code de votre application d'authentification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
            Vérifier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
