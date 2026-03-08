import { Loader2 } from 'lucide-react';

export function LogoutOverlay() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in">
      <div className="bg-card border-2 border-primary/20 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <div className="text-center">
          <h3 className="text-xl font-bold text-foreground mb-2">Déconnexion en cours...</h3>
          <p className="text-sm text-muted-foreground">À bientôt !</p>
        </div>
      </div>
    </div>
  );
}
