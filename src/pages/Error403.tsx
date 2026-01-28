/**
 * 403 Forbidden Error Page
 * Displayed when user lacks permission to access resource
 */

import { ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WarmPageContainer } from '@/components/ui/warm-page-container';
import { WarmEmptyState } from '@/components/ui/warm-empty-state';

export default function Error403() {
  const navigate = useNavigate();

  return (
    <WarmPageContainer maxWidth="md" className="min-h-screen flex items-center justify-center">
      <WarmEmptyState
        icon={ShieldX}
        title="Accès refusé"
        description="Vous n'avez pas les permissions nécessaires pour accéder à cette ressource."
        accentColor="destructive"
        action={{
          label: "Retour à l'accueil",
          onClick: () => navigate('/', { replace: true }),
        }}
        footer="Erreur 403 - Forbidden"
      />
    </WarmPageContainer>
  );
}
