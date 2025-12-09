/**
 * SignatureDialog - Dialog plein écran pour signature mobile
 * 
 * Optimisé pour les écrans tactiles avec mode paysage recommandé.
 */

import { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SignaturePad, SignaturePadRef } from './SignaturePad';
import { X, RotateCcw, Check, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SignatureDialogProps {
  /** Contrôle l'ouverture du dialog */
  open: boolean;
  /** Callback pour fermer le dialog */
  onOpenChange: (open: boolean) => void;
  /** Callback appelé avec la signature validée */
  onSignatureConfirm: (dataUrl: string) => void;
  /** Titre du dialog */
  title?: string;
  /** Description / instructions */
  description?: string;
  /** Nom du signataire (affiché pour confirmation) */
  signatoryName?: string;
  /** Texte de validation légale */
  legalText?: string;
}

export function SignatureDialog({
  open,
  onOpenChange,
  onSignatureConfirm,
  title = 'Signature',
  description = 'Signez dans le cadre ci-dessous',
  signatoryName,
  legalText = 'En signant, je confirme avoir pris connaissance du document et j\'en accepte les termes.',
}: SignatureDialogProps) {
  const signaturePadRef = useRef<SignaturePadRef>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleSignatureChange = useCallback((isEmpty: boolean) => {
    setHasSignature(!isEmpty);
  }, []);

  const handleConfirm = useCallback(() => {
    const signatureData = signaturePadRef.current?.getSignatureData();
    if (!signatureData) return;
    
    setIsConfirming(true);
    // Small delay for UX feedback
    setTimeout(() => {
      onSignatureConfirm(signatureData);
      setIsConfirming(false);
      onOpenChange(false);
    }, 300);
  }, [onSignatureConfirm, onOpenChange]);

  const handleCancel = useCallback(() => {
    signaturePadRef.current?.clear();
    setHasSignature(false);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          'max-w-3xl w-[95vw] max-h-[95vh] p-4 sm:p-6',
          'flex flex-col gap-4'
        )}
        // Prevent accidental close on mobile
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2">
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Mobile orientation hint */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md sm:hidden">
          <Smartphone className="h-4 w-4 rotate-90" />
          <span>Tournez votre appareil en mode paysage pour plus de confort</span>
        </div>

        {/* Signature Pad */}
        <div className="flex-1 min-h-[200px]">
          <SignaturePad
            ref={signaturePadRef}
            height={250}
            onChange={handleSignatureChange}
            showControls={true}
            placeholder="Dessinez votre signature ici"
            strokeWidth={2.5}
            className="w-full"
          />
        </div>

        {/* Signatory name display */}
        {signatoryName && (
          <div className="text-center text-sm text-muted-foreground">
            Signataire : <span className="font-medium text-foreground">{signatoryName}</span>
          </div>
        )}

        {/* Legal text */}
        <p className="text-xs text-muted-foreground text-center italic px-4">
          {legalText}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!hasSignature || isConfirming}
          >
            {isConfirming ? (
              <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Confirmer la signature
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
