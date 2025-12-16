/**
 * ApporteurInviteDialog - Formulaire d'invitation d'un utilisateur apporteur
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Mail } from 'lucide-react';
import { useInviteApporteurUser } from '@/hooks/useApporteurs';

interface ApporteurInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apporteurId: string;
  onSuccess: () => void;
}

export function ApporteurInviteDialog({
  open,
  onOpenChange,
  apporteurId,
  onSuccess,
}: ApporteurInviteDialogProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'reader' | 'manager'>('reader');

  const inviteUser = useInviteApporteurUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) return;

    try {
      await inviteUser.mutateAsync({
        apporteur_id: apporteurId,
        email: email.trim().toLowerCase(),
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        role,
      });
      
      // Reset form
      setEmail('');
      setFirstName('');
      setLastName('');
      setRole('reader');
      
      onSuccess();
    } catch {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Inviter un utilisateur
          </DialogTitle>
          <DialogDescription>
            L'utilisateur recevra un email pour créer son mot de passe et accéder à l'espace apporteur.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prénom</Label>
              <Input
                id="first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Prénom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nom</Label>
              <Input
                id="last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nom"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rôle *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'reader' | 'manager')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reader">Lecteur - Consultation uniquement</SelectItem>
                <SelectItem value="manager">Gestionnaire - Création de demandes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={inviteUser.isPending || !email.trim()}>
              {inviteUser.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Envoyer l'invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
