import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ChangePasswordDialog({ open, onOpenChange, onSuccess }: ChangePasswordDialogProps) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'destructive',
        duration: 4000,
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 6 caractères',
        variant: 'destructive',
        duration: 4000,
      });
      return;
    }

    setLoading(true);
    try {
      // Mettre à jour le mot de passe
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Mettre à jour le flag must_change_password
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ must_change_password: false } as any)
          .eq('id', user.id);

        if (profileError) console.error('Erreur mise à jour profil:', profileError);
      }

      toast({
        title: 'Mot de passe changé',
        description: 'Votre mot de passe a été mis à jour avec succès',
      });

      setNewPassword('');
      setConfirmPassword('');
      onSuccess();
    } catch (error: any) {
      console.error('Erreur changement mot de passe:', error);
      
      // Si la session n'existe plus, fermer le dialog pour permettre une reconnexion
      if (error.message?.includes('session') || error.message?.includes('Session')) {
        toast({
          title: 'Session expirée',
          description: 'Votre session a expiré. Veuillez vous reconnecter.',
          variant: 'destructive',
          duration: 4000,
        });
        // Fermer le dialog après un court délai
        setTimeout(() => {
          onOpenChange(false);
          // Déconnecter l'utilisateur pour forcer une reconnexion
          supabase.auth.signOut();
        }, 1000);
      } else {
        toast({
          title: 'Erreur',
          description: error.message || 'Impossible de changer le mot de passe',
          variant: 'destructive',
          duration: 4000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Changer votre mot de passe</DialogTitle>
          <DialogDescription>
            Vous devez changer votre mot de passe provisoire avant de continuer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Au moins 6 caractères"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Retapez le nouveau mot de passe"
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Changement en cours...' : 'Changer le mot de passe'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
