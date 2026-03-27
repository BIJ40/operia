import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EmpechementDialogProps {
  refDossier: string;
  clientFirstName: string;
  clientLastName: string;
  appointmentDate: Date;
  agencySlug?: string;
  verifiedPostalCode?: string; // REQUIRED for security
}

export const EmpechementDialog: React.FC<EmpechementDialogProps> = ({
  refDossier,
  clientFirstName,
  clientLastName,
  appointmentDate,
  agencySlug,
  verifiedPostalCode
}) => {
const [isSubmitting, setIsSubmitting] = useState(false);
  const [motif, setMotif] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSignalerEmpechement = async () => {
    if (!motif.trim()) {
      toast.error('Veuillez indiquer le motif de votre empêchement');
      return;
    }

    if (!verifiedPostalCode) {
      toast.error('Session expirée. Veuillez rafraîchir la page.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('signaler-empechement', {
        body: {
          refDossier,
          clientFirstName,
          clientLastName,
          appointmentDate: appointmentDate.toISOString(),
          motif: motif.trim(),
          agencySlug,
          codePostal: verifiedPostalCode
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error === 'Accès refusé') {
        toast.error('Session expirée. Veuillez rafraîchir la page.');
        return;
      }

      toast.success('Empêchement signalé ! Notre équipe a été prévenue et vous recontactera rapidement.');
      setMotif('');
      setIsOpen(false);
    } catch (error) {
      console.error('Error signaling empêchement:', error);
      toast.error("Erreur lors de l'envoi du signalement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="lg"
          className="h-12 px-6 text-base font-semibold border-2 border-destructive/50 text-destructive 
            hover:bg-destructive/10 hover:border-destructive hover:text-destructive
            transition-all duration-300 shadow-sm hover:shadow-md"
        >
          <AlertTriangle className="h-5 w-5 mr-2" />
          Signaler un empêchement
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Signaler un empêchement
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 text-left pt-2">
            <p className="font-semibold text-foreground">
              ⚠️ Attention : Cette action va annuler votre rendez-vous
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span>Notre équipe sera <strong>immédiatement prévenue</strong> de votre empêchement</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span>Votre rendez-vous actuel sera <strong>annulé</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span>Nous vous <strong>recontacterons rapidement</strong> pour convenir d'une nouvelle date</span>
              </li>
            </ul>
            <div className="pt-4 border-t space-y-2">
              <Label htmlFor="motif" className="text-sm font-semibold text-foreground">
                Motif de l'empêchement <span className="text-destructive">*</span>
              </Label>
              <div className="p-3 rounded-lg border-2 border-destructive/30 bg-destructive/5">
                <Textarea
                  id="motif"
                  placeholder="Indiquez la raison de votre empêchement (ex: maladie, urgence professionnelle, déplacement imprévu...)"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  className="min-h-[100px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isSubmitting}
                />
              </div>
              {!motif.trim() && (
                <p className="text-xs text-destructive">Ce champ est obligatoire</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>
            Annuler
          </AlertDialogCancel>
          <Button
            onClick={handleSignalerEmpechement}
            disabled={isSubmitting || !motif.trim()}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isSubmitting ? 'Envoi en cours...' : 'Confirmer l\'empêchement'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};