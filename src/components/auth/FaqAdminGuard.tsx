/**
 * Guard pour l'accès à l'administration FAQ
 * Permet l'accès si :
 * - N5+ (platform_admin ou superadmin)
 * - OU si option admin_plateforme.faq_admin activée
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Loader2, Lock } from 'lucide-react';

interface FaqAdminGuardProps {
  children: ReactNode;
  redirectTo?: string;
}

export function FaqAdminGuard({ children, redirectTo = '/' }: FaqAdminGuardProps) {
  const { isAuthLoading, isAuthenticated } = useAuthCore();
  const { canAccessFaqAdmin } = usePermissionsBridge();

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Check FAQ admin access
  if (!canAccessFaqAdmin) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
          <Lock className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Accès refusé</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Vous n'avez pas les permissions nécessaires pour accéder à l'administration FAQ.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Contactez un administrateur pour activer l'option "Admin FAQ".
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
