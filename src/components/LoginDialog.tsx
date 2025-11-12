import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const navigate = useNavigate();

  const handleRedirect = () => {
    onOpenChange(false);
    navigate('/auth');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Authentification requise</DialogTitle>
          <DialogDescription>
            Vous devez vous connecter pour accéder au mode édition
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cette action nécessite une authentification. Vous allez être redirigé vers la page de connexion.
          </p>
          <Button onClick={handleRedirect} className="w-full">
            Aller à la page de connexion
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
