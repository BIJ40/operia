import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ContactUpdateDialogProps {
  refDossier: string;
  clientName: string;
  currentEmail?: string;
  currentFixe?: string;
  currentPortable?: string;
  agencySlug?: string;
  verifiedPostalCode?: string; // REQUIRED for security
}

export const ContactUpdateDialog: React.FC<ContactUpdateDialogProps> = ({
  refDossier,
  clientName,
  currentEmail,
  currentFixe,
  currentPortable,
  agencySlug,
  verifiedPostalCode,
}) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(currentEmail || '');
  const [fixe, setFixe] = useState(currentFixe || '');
  const [portable, setPortable] = useState(currentPortable || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (email && !email.includes('@')) {
      toast.error('Veuillez saisir une adresse email valide');
      return;
    }

    if (!verifiedPostalCode) {
      toast.error('Session expirée. Veuillez rafraîchir la page.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-client-contact', {
        body: {
          refDossier,
          clientName,
          email: email || null,
          fixe: fixe || null,
          portable: portable || null,
          oldEmail: currentEmail,
          oldFixe: currentFixe,
          oldPortable: currentPortable,
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

      toast.success('Demande de modification envoyée avec succès');
      setOpen(false);
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-info hover:text-info/80"
        >
          <Pencil className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier les informations de contact</DialogTitle>
          <DialogDescription>
            Modifiez vos coordonnées ci-dessous. Une demande sera envoyée à notre équipe.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fixe">Téléphone fixe</Label>
            <Input
              id="fixe"
              type="tel"
              placeholder="01 23 45 67 89"
              value={fixe}
              onChange={(e) => setFixe(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="portable">Téléphone portable</Label>
            <Input
              id="portable"
              type="tel"
              placeholder="06 12 34 56 78"
              value={portable}
              onChange={(e) => setPortable(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Envoi...' : 'Envoyer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};