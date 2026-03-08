/**
 * ModuleGuard V2.1 - Utilise le Permissions Engine centralisé
 * Protection de routes basée sur les modules activés
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { hasAccess, MODULE_LABELS } from '@/permissions';
import { ModuleKey } from '@/types/modules';
import { Loader2, Lock } from 'lucide-react';

interface ModuleGuardProps {
  /** Module requis pour accéder */
  moduleKey: ModuleKey;
  /** Option spécifique du module requise (ex: 'coffre' pour rh.coffre) */
  requiredOption?: string;
  /** Liste d'options acceptées (logique OR) - ex: ['rh_viewer', 'rh_admin'] */
  requiredOptions?: string[];
  /** Contenu à afficher si autorisé */
  children: ReactNode;
  /** Redirection si non autorisé (défaut: /) */
  redirectTo?: string;
  /** Afficher une page d'erreur au lieu de rediriger */
  showError?: boolean;
  /** Message d'erreur personnalisé */
  errorMessage?: string;
}

/**
 * Guard de route basé sur les modules V2.1
 * Utilise le Permissions Engine centralisé
 * 
 * Autorise l'accès si:
 * - L'utilisateur a le module activé (explicite ou par défaut du rôle)
 * - ET l'option spécifique si requiredOption est défini
 * - OU au moins une des options dans requiredOptions (logique OR)
 * - OU l'utilisateur est platform_admin/superadmin (N5+ bypass)
 */
export function ModuleGuard({ 
  moduleKey, 
  requiredOption,
  requiredOptions,
  children, 
  redirectTo = '/',
  showError = false,
  errorMessage
}: ModuleGuardProps) {
  const { user, isAuthLoading } = useAuthCore();
  const { enabledModules, globalRole, accessContext: { agencyId } } = usePermissions();

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

  // Construire le contexte de permissions
  const permissionContext = {
    globalRole,
    enabledModules,
    agencyId,
  };

  // Vérifier l'accès au module via le Permissions Engine
  let canAccessModule = false;

  if (requiredOptions && requiredOptions.length > 0) {
    // Logique OR : au moins une des options doit être accessible
    canAccessModule = requiredOptions.some(opt => 
      hasAccess({ ...permissionContext, moduleId: moduleKey, optionId: opt })
    );
  } else if (requiredOption) {
    // Option unique requise
    canAccessModule = hasAccess({ 
      ...permissionContext, 
      moduleId: moduleKey, 
      optionId: requiredOption 
    });
  } else {
    // Juste le module
    canAccessModule = hasAccess({ 
      ...permissionContext, 
      moduleId: moduleKey 
    });
  }

  if (!canAccessModule) {
    if (showError) {
      return (
        <ModuleAccessDeniedPage 
          moduleKey={moduleKey}
          message={errorMessage}
        />
      );
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

/**
 * Page d'accès refusé pour module
 */
function ModuleAccessDeniedPage({ 
  moduleKey, 
  message 
}: { 
  moduleKey: ModuleKey;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-6">
        <Lock className="w-10 h-10 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-3">
        Module non activé
      </h1>
      <p className="text-muted-foreground text-center max-w-md mb-4">
        {message || "Vous n'avez pas accès à ce module. Contactez votre administrateur pour l'activer."}
      </p>
      <p className="text-sm text-muted-foreground">
        Module requis : <span className="font-semibold text-foreground">
          {MODULE_LABELS[moduleKey] || moduleKey}
        </span>
      </p>
    </div>
  );
}

export default ModuleGuard;
