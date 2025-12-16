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
import { Loader2, Mail, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { useInviteApporteurUser } from '@/hooks/useApporteurs';
import { toast } from 'sonner';

interface ApporteurInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apporteurId: string;
  onSuccess: () => void;
}

interface InviteResult {
  success: boolean;
  is_new_user: boolean;
  action_link?: string;
  note?: string;
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
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);

  const inviteUser = useInviteApporteurUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) return;

    try {
      const result = await inviteUser.mutateAsync({
        apporteur_id: apporteurId,
        email: email.trim().toLowerCase(),
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        role,
      });
      
      // Show result with action_link if available
      setInviteResult(result as InviteResult);
    } catch {
      // Error handled in hook
    }
  };

  const handleClose = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setRole('reader');
    setInviteResult(null);
    onOpenChange(false);
    if (inviteResult?.success) {
      onSuccess();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Lien copié dans le presse-papier');
  };

  // Success view with action link
  if (inviteResult?.success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Invitation envoyée
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {inviteResult.is_new_user 
                ? "Un nouvel utilisateur a été créé. Il doit définir son mot de passe pour accéder à l'espace apporteur."
                : "L'utilisateur existant a été lié à cet apporteur."
              }
            </p>

            {inviteResult.action_link && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {inviteResult.is_new_user 
                    ? "Lien de définition du mot de passe"
                    : "Lien de connexion (magic link)"
                  }
                </Label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={inviteResult.action_link}
                    readOnly
                    className="text-xs font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(inviteResult.action_link!)}
                    title="Copier le lien"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(inviteResult.action_link!, '_blank')}
                    title="Ouvrir dans un nouvel onglet"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {inviteResult.is_new_user 
                    ? "Transmettez ce lien à l'utilisateur pour qu'il définisse son mot de passe."
                    : "Ce lien permet à l'utilisateur de se connecter directement."
                  }
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
              onClick={handleClose}
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
