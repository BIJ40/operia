/**
 * ApporteurLoginDialog - Dialog de connexion pour les apporteurs
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Building2, Mail, Lock } from 'lucide-react';

interface ApporteurLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApporteurLoginDialog({ open, onOpenChange }: ApporteurLoginDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError('Email ou mot de passe incorrect');
        return;
      }

      if (!data.user) {
        setError('Erreur de connexion');
        return;
      }

      // Vérifier que l'utilisateur est bien un apporteur
      const { data: apporteurUser, error: apporteurError } = await supabase
        .from('apporteur_users')
        .select('id, is_active')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
        .single();

      if (apporteurError || !apporteurUser) {
        // L'utilisateur n'est pas un apporteur - le déconnecter
        await supabase.auth.signOut();
        setError('Ce compte n\'est pas associé à un apporteur. Veuillez contacter votre agence HelpConfort.');
        return;
      }

      toast.success('Connexion réussie');
      onOpenChange(false);
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error('Login error:', err);
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-[hsl(var(--primary-dark))] flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <DialogTitle className="text-xl">Connexion Apporteur</DialogTitle>
          <DialogDescription>
            Accédez à votre espace partenaire HelpConfort
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connexion...
              </>
            ) : (
              'Se connecter'
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Vous n'avez pas de compte ? Contactez votre agence HelpConfort.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
