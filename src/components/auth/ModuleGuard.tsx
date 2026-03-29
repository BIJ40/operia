/**
 * ModuleGuard V3.0 — Utilise usePermissionsBridge (transition V1→V2)
 * Protection de routes basée sur les modules activés
 */

import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Lock } from 'lucide-react';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { useModuleLabels } from '@/hooks/useModuleLabels';
import type { ModuleKey } from '@/types/modules';

interface ModuleGuardProps {
  /** Module requis pour accéder */
  moduleKey: ModuleKey;
  /** Option spécifique du module requise (ex: 'coffre' pour rh.coffre) */
  requiredOption?: string;
  /** Liste d'options acceptées (logique OR) — ex: ['rh_viewer', 'rh_admin'] */
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
 * Page d'accès refusé pour module
 */
function ModuleAccessDeniedPage({
  moduleKey,
  message,
}: {
  moduleKey: ModuleKey;
  message?: string;
}) {
  const { getLabel } = useModuleLabels();
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
          {getLabel(moduleKey)}
        </span>
      </p>
    </div>
  );
}

/**
 * Guard de route basé sur les modules V3.0
 * Utilise usePermissionsBridge (transition V1→V2)
 *
 * Autorise l'accès si :
 * - L'utilisateur est admin (N5+ bypass) — équivalent isBypassRole() V1
 * - OU le module est activé ET l'option requise est présente
 * - OU au moins une des options dans requiredOptions (logique OR)
 */
export function ModuleGuard({
  moduleKey,
  requiredOption,
  requiredOptions,
  children,
  redirectTo = '/',
  showError = false,
  errorMessage,
}: ModuleGuardProps) {
  const { hasModule, hasModuleOption, isAdmin } = usePermissionsBridge();
  const { user, isAuthLoading } = useAuthCore();

  // Chargement en cours
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  // Non authentifié
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Vérification des droits
  // isAdmin (N5+) bypass total — identique à isBypassRole() V1
  let canAccess = false;

  if (isAdmin) {
    canAccess = true;
  } else if (requiredOptions && requiredOptions.length > 0) {
    canAccess = requiredOptions.some(opt =>
      hasModuleOption(moduleKey, opt)
    );
  } else if (requiredOption) {
    canAccess = hasModuleOption(moduleKey, requiredOption);
  } else {
    canAccess = hasModule(moduleKey);
  }

  if (!canAccess) {
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

export default ModuleGuard;
