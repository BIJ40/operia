/**
 * 401 Unauthorized Error Page
 * Displayed when user auth token is invalid or expired
 */

import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { WarmPageContainer } from '@/components/ui/warm-page-container';
import { WarmEmptyState } from '@/components/ui/warm-empty-state';

export default function Error401() {
  const navigate = useNavigate();
  const { logout } = useAuthCore();

  const handleRelogin = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <WarmPageContainer maxWidth="md" className="min-h-screen flex items-center justify-center">
      <WarmEmptyState
        icon={ShieldAlert}
        title="Session expirée"
        description="Votre session n'est plus valide. Veuillez vous reconnecter pour continuer."
        accentColor="destructive"
        action={{
          label: "Se reconnecter",
          onClick: handleRelogin,
        }}
        footer="Erreur 401 - Unauthorized"
      />
    </WarmPageContainer>
  );
}
