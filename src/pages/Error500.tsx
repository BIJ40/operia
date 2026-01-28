/**
 * 500 Internal Server Error Page
 * Displayed when Supabase or backend encounters critical error
 */

import { ServerCrash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WarmPageContainer } from '@/components/ui/warm-page-container';
import { WarmEmptyState } from '@/components/ui/warm-empty-state';

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
    <WarmPageContainer maxWidth="md" className="min-h-screen flex items-center justify-center">
      <WarmEmptyState
        icon={ServerCrash}
        title="Erreur serveur"
        description="Une erreur technique est survenue. L'équipe support a été notifiée automatiquement."
        accentColor="destructive"
        action={{
          label: "Réessayer",
          onClick: handleRetry,
        }}
        secondaryAction={{
          label: "Retour à l'accueil",
          onClick: () => navigate('/', { replace: true }),
        }}
        footer={correlationId ? `ID de suivi : ${correlationId} • Erreur 500` : "Erreur 500 - Internal Server Error"}
      />
    </WarmPageContainer>
  );
}
