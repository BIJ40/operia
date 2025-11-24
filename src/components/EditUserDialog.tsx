import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  pseudo: string | null;
  first_name: string | null;
  last_name: string | null;
  agence: string | null;
  role_agence: string | null;
  created_at: string;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onSuccess: () => void;
}

const ROLE_OPTIONS = ['Dirigeant(e)', 'Assistant(e)', 'Technicien(ne)', 'Autre'];

export function EditUserDialog({ open, onOpenChange, user, onSuccess }: EditUserDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pseudo, setPseudo] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [agence, setAgence] = useState('');
  const [roleAgence, setRoleAgence] = useState('');

  useEffect(() => {
    if (user) {
      setPseudo(user.pseudo || '');
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setAgence(user.agence || '');
      setRoleAgence(user.role_agence || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          pseudo: pseudo.trim() || null,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          agence: agence.trim() || null,
          role_agence: roleAgence || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Utilisateur modifié',
        description: 'Les informations ont été mises à jour avec succès',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erreur modification utilisateur:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier l\'utilisateur',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier l'utilisateur</DialogTitle>
          <DialogDescription>
            Modifiez les informations de l'utilisateur
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-pseudo">Pseudo</Label>
            <Input
              id="edit-pseudo"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="pseudo_utilisateur"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">Prénom</Label>
              <Input
                id="edit-firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jean"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Nom</Label>
              <Input
                id="edit-lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Dupont"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-agence">Agence</Label>
            <Input
              id="edit-agence"
              value={agence}
              onChange={(e) => setAgence(e.target.value)}
              placeholder="Nom de l'agence"
            />
          </div>

          <div className="space-y-3">
            <Label>Rôle dans l'agence</Label>
            <RadioGroup value={roleAgence} onValueChange={setRoleAgence}>
              {ROLE_OPTIONS.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <RadioGroupItem value={role} id={`edit-role-${role}`} />
                  <Label htmlFor={`edit-role-${role}`} className="cursor-pointer font-normal">
                    {role}
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
