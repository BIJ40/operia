/**
 * ModuleGuard - Composant de protection de routes basé sur les modules activés
 * Permet l'accès si l'utilisateur a le module activé OU est admin (N5+)
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ModuleKey, isModuleEnabled, isModuleOptionEnabled } from '@/types/modules';
import { hasMinimumRole } from '@/types/globalRoles';
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
 * Guard de route basé sur les modules V2.0
 * Autorise l'accès si:
 * - L'utilisateur a le module activé dans enabled_modules
 * - ET l'option spécifique si requiredOption est défini
 * - OU au moins une des options dans requiredOptions (logique OR)
 * - OU l'utilisateur est platform_admin/superadmin (N5+)
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
  const { user, isAuthLoading, enabledModules, globalRole } = useAuth();

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

  // Admin bypass (N5+ a toujours accès)
  const isAdmin = hasMinimumRole(globalRole, 'platform_admin');
  
  // Vérifier si le module est activé
  const hasModule = isModuleEnabled(enabledModules, moduleKey);
  
  // Vérifier les options (logique OR si requiredOptions, sinon requiredOption simple)
  let hasRequiredOption = true;
  
  if (requiredOptions && requiredOptions.length > 0) {
    // Logique OR : au moins une des options doit être activée
    hasRequiredOption = requiredOptions.some(opt => 
      isModuleOptionEnabled(enabledModules, moduleKey, opt)
    );
  } else if (requiredOption) {
    // Option unique requise
    hasRequiredOption = isModuleOptionEnabled(enabledModules, moduleKey, requiredOption);
  }

  if (!isAdmin && (!hasModule || !hasRequiredOption)) {
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
  const moduleLabels: Record<ModuleKey, string> = {
    help_academy: 'Help! Academy',
    pilotage_agence: 'Pilotage Agence',
    reseau_franchiseur: 'Réseau Franchiseur',
    support: 'Support',
    admin_plateforme: 'Administration',
    apogee_tickets: 'Gestion de Projet',
    rh: 'RH',
    parc: 'Parc',
    messaging: 'Messagerie interne',
    unified_search: 'Recherche unifiée',
    technicien: 'Technicien',
  };

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
          {moduleLabels[moduleKey] || moduleKey}
        </span>
      </p>
    </div>
  );
}

export default ModuleGuard;
