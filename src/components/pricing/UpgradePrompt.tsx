/**
 * UpgradePrompt — Affiché quand un utilisateur n'a pas l'abonnement requis
 */
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'react-router-dom';

interface UpgradePromptProps {
  planLabel?: string;
}

export function UpgradePrompt({ planLabel }: UpgradePromptProps) {
  const [, setSearchParams] = useSearchParams();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Module réservé aux abonnés</h3>
      <p className="text-muted-foreground max-w-md mb-6">
        {planLabel
          ? `Ce module nécessite l'abonnement "${planLabel}" pour être accessible.`
          : 'Souscrivez à un abonnement pour débloquer cette fonctionnalité.'}
      </p>
      <Button onClick={() => setSearchParams({ tab: 'accueil' }, { replace: true })}>
        Voir les offres
      </Button>
    </div>
  );
}
