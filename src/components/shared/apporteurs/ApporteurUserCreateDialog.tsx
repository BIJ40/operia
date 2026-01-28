/**
 * ApporteurUserCreateDialog - Dialog de création utilisateur apporteur
 * Utilise le même pattern que UserCreateForm avec génération de mot de passe
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { UserPlus, Copy, CheckCircle } from 'lucide-react';
import { useCreateApporteurUser } from '@/hooks/useApporteurs';
import { ApporteurUserCreateForm, CreateApporteurUserPayload } from './ApporteurUserCreateForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ApporteurUserCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apporteurId: string;
  onSuccess: () => void;
}

interface CreationResult {
  success: boolean;
  email: string;
  password: string;
  is_new_user: boolean;
}

export function ApporteurUserCreateDialog({
  open,
  onOpenChange,
  apporteurId,
  onSuccess,
}: ApporteurUserCreateDialogProps) {
  const [creationResult, setCreationResult] = useState<CreationResult | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  
  const createUser = useCreateApporteurUser();

  const handleSubmit = async (payload: CreateApporteurUserPayload) => {
    try {
      const result = await createUser.mutateAsync({
        apporteur_id: apporteurId,
        email: payload.email,
        password: payload.password,
        first_name: payload.firstName,
        last_name: payload.lastName,
        role: payload.role,
        send_email: payload.sendEmail,
      });
      
      // Store result for success view
      setCreationResult({
        success: true,
        email: payload.email,
        password: payload.password,
        is_new_user: result.is_new_user,
      });
    } catch {
      // Error handled in hook
    }
  };

  const handleClose = () => {
    setCreationResult(null);
    setPasswordCopied(false);
    setEmailCopied(false);
    onOpenChange(false);
    if (creationResult?.success) {
      onSuccess();
    }
  };

  const copyToClipboard = (text: string, type: 'email' | 'password') => {
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 3000);
    } else {
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 3000);
    }
    toast.success('Copié dans le presse-papier');
  };

  // Success view with credentials
  if (creationResult?.success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Utilisateur créé avec succès
            </DialogTitle>
            <DialogDescription>
              {creationResult.is_new_user 
                ? "Un nouvel utilisateur a été créé."
                : "L'utilisateur existant a été mis à jour."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
              <p className="text-sm font-medium">
                🔑 Identifiants de connexion à transmettre :
              </p>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={creationResult.email}
                    readOnly
                    className="font-mono text-sm bg-background"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(creationResult.email, 'email')}
                    title="Copier l'email"
                  >
                    {emailCopied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Mot de passe</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={creationResult.password}
                    readOnly
                    className="font-mono text-sm bg-background"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(creationResult.password, 'password')}
                    title="Copier le mot de passe"
                  >
                    {passwordCopied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                ⚠️ Transmettez ces identifiants de manière sécurisée à l'utilisateur.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleClose}>Fermer</Button>
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
            <UserPlus className="h-5 w-5" />
            Créer un utilisateur
          </DialogTitle>
          <DialogDescription>
            Créez un compte pour accéder à l'espace apporteur.
          </DialogDescription>
        </DialogHeader>
        
        <ApporteurUserCreateForm 
          onSubmit={handleSubmit}
          isSubmitting={createUser.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
