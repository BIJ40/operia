/**
 * Offline fallback page for the technician PWA
 */
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TechnicianOfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-sm space-y-6">
        <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center">
          <WifiOff className="h-10 w-10 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Hors ligne</h1>
          <p className="text-muted-foreground">
            Vous n'êtes pas connecté à Internet. Vérifiez votre connexion et réessayez.
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={handleRetry} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>

          <p className="text-xs text-muted-foreground">
            Si vous aviez des données en cache, elles seront disponibles sur la page Planning.
          </p>
        </div>
      </div>
    </div>
  );
}
