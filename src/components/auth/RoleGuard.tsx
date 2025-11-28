/**
 * RoleGuard V2.0 - Composant de protection de routes basé sur les rôles globaux
 * Remplace les vérifications isAdmin dispersées dans le code
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useHasGlobalRole } from '@/hooks/useHasGlobalRole';
import { GlobalRole, GLOBAL_ROLE_LABELS } from '@/types/globalRoles';
import { Loader2, ShieldX } from 'lucide-react';

interface RoleGuardProps {
  /** Rôle minimum requis pour accéder (N0-N6) */
  minRole?: GlobalRole;
  /** Contenu à afficher si autorisé */
  children: ReactNode;
  /** Redirection si non autorisé (défaut: /unauthorized) */
  redirectTo?: string;
  /** Afficher une page d'erreur au lieu de rediriger */
  showError?: boolean;
  /** Message d'erreur personnalisé */
  errorMessage?: string;
}

/**
 * Guard de route basé sur les rôles V2.0
 * 
 * @example
 * // Accès réservé aux platform_admin (N5+)
 * <RoleGuard minRole="platform_admin">
 *   <AdminUsersUnified />
 * </RoleGuard>
 * 
 * @example
 * // Accès réservé aux franchisor_user (N3+)
 * <RoleGuard minRole="franchisor_user" redirectTo="/">
 *   <FranchiseurDashboard />
 * </RoleGuard>
 */
export function RoleGuard({ 
  minRole, 
  children, 
  redirectTo = '/',
  showError = false,
  errorMessage
}: RoleGuardProps) {
  const { user, isAuthLoading } = useAuth();
  const hasRequiredRole = useHasGlobalRole(minRole);

  // Afficher un loader pendant le chargement
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  // Rediriger vers login si non authentifié
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Vérifier le rôle si requis
  if (minRole && !hasRequiredRole) {
    if (showError) {
      return (
        <AccessDeniedPage 
          requiredRole={minRole} 
          message={errorMessage}
        />
      );
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

/**
 * Page d'accès refusé
 */
function AccessDeniedPage({ 
  requiredRole, 
  message 
}: { 
  requiredRole: GlobalRole;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-6">
        <ShieldX className="w-10 h-10 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-3">
        Accès refusé
      </h1>
      <p className="text-muted-foreground text-center max-w-md mb-4">
        {message || "Vous n'avez pas les permissions nécessaires pour accéder à cette page."}
      </p>
      <p className="text-sm text-muted-foreground">
        Niveau requis : <span className="font-semibold text-foreground">
          {GLOBAL_ROLE_LABELS[requiredRole]}
        </span>
      </p>
    </div>
  );
}

/**
 * HOC pour protéger un composant avec un rôle
 */
export function withRoleGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  minRole: GlobalRole,
  options?: Omit<RoleGuardProps, 'minRole' | 'children'>
) {
  return function GuardedComponent(props: P) {
    return (
      <RoleGuard minRole={minRole} {...options}>
        <WrappedComponent {...props} />
      </RoleGuard>
    );
  };
}

export default RoleGuard;
