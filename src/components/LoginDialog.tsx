import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const loginSchema = z.object({
  pseudo: z.string()
    .trim()
    .min(3, { message: "Le pseudo doit contenir au moins 3 caractères" }),
  password: z.string()
    .min(1, { message: "Le mot de passe est requis" })
});

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const validation = loginSchema.safeParse({
      pseudo: pseudo.trim(),
      password
    });

    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          newErrors[issue.path[0] as string] = issue.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const trimmedPseudo = pseudo.trim();
      // Si le pseudo ressemble à un email, on l'utilise directement ; sinon on génère l'email interne
      const email = trimmedPseudo.includes('@')
        ? trimmedPseudo
        : `${trimmedPseudo}@internal.helpogee.local`;
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw new Error('Pseudo ou mot de passe incorrect');
      }

      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue !',
      });

      onOpenChange(false);
      setPseudo('');
      setPassword('');
    } catch (error: any) {
      toast({
        title: 'Erreur de connexion',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connexion</DialogTitle>
          <DialogDescription>
            Connectez-vous avec votre pseudo et votre mot de passe.
            <br />
            <span className="text-xs text-muted-foreground">
              Si vous avez perdu votre mot de passe, contactez votre administrateur.
            </span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pseudo">Pseudo</Label>
            <Input
              id="pseudo"
              value={pseudo}
              onChange={(e) => {
                setPseudo(e.target.value);
                setErrors(prev => ({ ...prev, pseudo: '' }));
              }}
              placeholder="votre_pseudo"
              required
              className={errors.pseudo ? 'border-destructive' : ''}
            />
            {errors.pseudo && <p className="text-sm text-destructive">{errors.pseudo}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors(prev => ({ ...prev, password: '' }));
              }}
              placeholder="••••••••"
              required
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
