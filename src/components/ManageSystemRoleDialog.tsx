import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ManageSystemRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userName: string | null;
  onSuccess: () => void;
}

const SYSTEM_ROLES = [
  { value: 'user', label: 'Utilisateur (accès standard)' },
  { value: 'support', label: 'Support (accès console support)' },
  { value: 'franchiseur', label: 'Franchiseur (accès réseau)' },
  { value: 'admin', label: 'Administrateur (accès complet)' },
];

export function ManageSystemRoleDialog({ 
  open, 
  onOpenChange, 
  userId, 
  userName,
  onSuccess 
}: ManageSystemRoleDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentRole, setCurrentRole] = useState<string>('user');
  const [selectedRole, setSelectedRole] = useState<string>('user');

  useEffect(() => {
    if (userId && open) {
      loadCurrentRole();
    }
  }, [userId, open]);

  const loadCurrentRole = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      const role = data?.role || 'user';
      setCurrentRole(role);
      setSelectedRole(role);
    } catch (error) {
      console.error('Erreur chargement rôle:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    try {
      // Supprimer l'ancien rôle
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Ajouter le nouveau rôle
      const { error } = await supabase
        .from('user_roles')
        .insert([{
          user_id: userId,
          role: selectedRole as 'admin' | 'support' | 'user' | 'franchiseur'
        }]);

      if (error) throw error;

      toast({
        title: 'Rôle modifié',
        description: `Le rôle système a été mis à jour avec succès`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erreur modification rôle:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier le rôle système',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gérer le rôle système</DialogTitle>
          <DialogDescription>
            Attribuer un rôle système à {userName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>Rôle système</Label>
            <RadioGroup value={selectedRole} onValueChange={setSelectedRole}>
              {SYSTEM_ROLES.map((role) => (
                <div key={role.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={role.value} id={`role-${role.value}`} />
                  <Label htmlFor={`role-${role.value}`} className="cursor-pointer font-normal">
                    {role.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
