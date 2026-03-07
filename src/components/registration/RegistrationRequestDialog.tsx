import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { Loader2, UserPlus, CheckCircle2 } from 'lucide-react';

interface RegistrationRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const registrationSchema = z.object({
  first_name: z.string().trim().min(1, 'Le prénom est requis').max(100),
  last_name: z.string().trim().min(1, 'Le nom est requis').max(100),
  email: z.string().trim().email("L'adresse email n'est pas valide").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  company_name: z.string().trim().max(200).optional().or(z.literal('')),
  agency_name: z.string().trim().max(200).optional().or(z.literal('')),
  message: z.string().trim().max(1000).optional().or(z.literal('')),
});

export function RegistrationRequestDialog({ open, onOpenChange }: RegistrationRequestDialogProps) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    agency_name: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = registrationSchema.safeParse(form);
    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.issues.forEach(issue => {
        if (issue.path[0]) newErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('pending_registrations').insert({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        company_name: form.company_name.trim() || null,
        message: form.message.trim() || null,
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Une demande avec cet email existe déjà.');
        }
        throw error;
      }

      setSubmitted(true);
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message || "Impossible d'envoyer la demande.",
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    if (submitted) {
      setTimeout(() => {
        setSubmitted(false);
        setForm({ first_name: '', last_name: '', email: '', phone: '', company_name: '', message: '' });
      }, 300);
    }
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-6 gap-4">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <DialogTitle className="text-xl">Demande envoyée !</DialogTitle>
            <DialogDescription className="text-base">
              Votre demande d'inscription a bien été transmise. Un administrateur l'examinera dans les meilleurs délais. Vous recevrez un email une fois votre compte activé.
            </DialogDescription>
            <Button onClick={handleClose} className="mt-2">Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Demande d'inscription
          </DialogTitle>
          <DialogDescription>
            Remplissez ce formulaire pour demander un accès. Un administrateur validera votre demande.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reg-first-name">Prénom *</Label>
              <Input
                id="reg-first-name"
                value={form.first_name}
                onChange={e => updateField('first_name', e.target.value)}
                placeholder="Jean"
                required
                className={errors.first_name ? 'border-destructive' : ''}
              />
              {errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-last-name">Nom *</Label>
              <Input
                id="reg-last-name"
                value={form.last_name}
                onChange={e => updateField('last_name', e.target.value)}
                placeholder="Dupont"
                required
                className={errors.last_name ? 'border-destructive' : ''}
              />
              {errors.last_name && <p className="text-xs text-destructive">{errors.last_name}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-email">Email *</Label>
            <Input
              id="reg-email"
              type="email"
              value={form.email}
              onChange={e => updateField('email', e.target.value)}
              placeholder="jean.dupont@exemple.com"
              required
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-phone">Téléphone</Label>
            <Input
              id="reg-phone"
              type="tel"
              value={form.phone}
              onChange={e => updateField('phone', e.target.value)}
              placeholder="06 12 34 56 78"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-company">Société</Label>
            <Input
              id="reg-company"
              value={form.company_name}
              onChange={e => updateField('company_name', e.target.value)}
              placeholder="Nom de votre entreprise"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-message">Message (optionnel)</Label>
            <Textarea
              id="reg-message"
              value={form.message}
              onChange={e => updateField('message', e.target.value)}
              placeholder="Précisez votre besoin ou le contexte de votre demande..."
              rows={3}
              maxLength={1000}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full gap-2">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi en cours…
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Envoyer ma demande
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
