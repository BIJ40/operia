import { Construction, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface MaintenanceBlockProps {
  message: string;
}

export function MaintenanceBlock({ message }: MaintenanceBlockProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="max-w-lg mx-auto p-8 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
          <Construction className="w-10 h-10 text-amber-500" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">
            Maintenance en cours
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </Button>
          <Button
            variant="ghost"
            onClick={handleLogout}
          >
            Se déconnecter
          </Button>
        </div>

        <p className="text-xs text-muted-foreground/60 pt-4">
          Si le problème persiste, contactez votre administrateur.
        </p>
      </div>
    </div>
  );
}
