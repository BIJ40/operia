/**
 * 500 Internal Server Error Page
 * Displayed when Supabase or backend encounters critical error
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ServerCrash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Error500Props {
  correlationId?: string;
  onRetry?: () => void;
}

export default function Error500({ correlationId, onRetry }: Error500Props) {
  const navigate = useNavigate();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full border-l-4 border-l-destructive">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <ServerCrash className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Erreur serveur</CardTitle>
          <CardDescription>
            Une erreur technique est survenue. L'équipe support a été notifiée automatiquement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleRetry} variant="default" className="w-full">
            Réessayer
          </Button>
          <Button onClick={() => navigate('/', { replace: true })} variant="outline" className="w-full">
            Retour à l'accueil
          </Button>
          {correlationId && (
            <p className="text-xs text-center text-muted-foreground">
              ID de suivi : {correlationId}
            </p>
          )}
          <p className="text-xs text-center text-muted-foreground">
            Code erreur : 500 - Internal Server Error
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
