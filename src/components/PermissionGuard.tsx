import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/use-permissions';
import { ScopeSlug, PERMISSION_LEVELS, PERMISSION_LEVEL_LABELS } from '@/types/permissions';
import { Shield, Lock } from 'lucide-react';

interface PermissionGuardProps {
  scope: ScopeSlug | string;
  requiredLevel?: number;
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
  showAccessDenied?: boolean;
}

/**
 * Guard de permission pour protéger les pages/composants
 * 
 * @param scope - Le slug du scope à vérifier
 * @param requiredLevel - Le niveau minimum requis (défaut: VIEW = 1)
 * @param children - Le contenu à afficher si autorisé
 * @param fallback - Contenu alternatif si non autorisé (optionnel)
 * @param redirectTo - URL de redirection si non autorisé (optionnel)
 * @param showAccessDenied - Afficher un message d'accès refusé (défaut: true)
 */
export function PermissionGuard({
  scope,
  requiredLevel = PERMISSION_LEVELS.VIEW,
  children,
  fallback,
  redirectTo,
  showAccessDenied = true
}: PermissionGuardProps) {
  const { getPermissionLevel, isAdmin } = usePermissions();
  
  const userLevel = isAdmin ? PERMISSION_LEVELS.ADMIN : getPermissionLevel(scope);
  const hasAccess = userLevel >= requiredLevel;

  if (hasAccess) {
    return <>{children}</>;
  }

  // Redirection si spécifiée
  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  // Fallback personnalisé
  if (fallback) {
    return <>{fallback}</>;
  }

  // Message d'accès refusé par défaut
  if (showAccessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
          <Lock className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Accès refusé</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Vous n'avez pas les permissions nécessaires pour accéder à cette section.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Niveau requis : <span className="font-medium">{PERMISSION_LEVEL_LABELS[requiredLevel]}</span>
        </p>
      </div>
    );
  }

  return null;
}

interface ConditionalRenderProps {
  scope: ScopeSlug | string;
  requiredLevel?: number;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Rendu conditionnel basé sur les permissions (sans redirection)
 * Utile pour masquer/afficher des boutons, sections, etc.
 */
export function ConditionalRender({
  scope,
  requiredLevel = PERMISSION_LEVELS.VIEW,
  children,
  fallback = null
}: ConditionalRenderProps) {
  const { getPermissionLevel, isAdmin } = usePermissions();
  
  const userLevel = isAdmin ? PERMISSION_LEVELS.ADMIN : getPermissionLevel(scope);
  const hasAccess = userLevel >= requiredLevel;

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Hook pour obtenir les props de bouton selon le niveau
 * Retourne les props à appliquer sur un bouton (disabled, title, etc.)
 */
export function useButtonPermission(scope: ScopeSlug | string, requiredLevel: number) {
  const { getPermissionLevel, isAdmin } = usePermissions();
  
  const userLevel = isAdmin ? PERMISSION_LEVELS.ADMIN : getPermissionLevel(scope);
  const hasAccess = userLevel >= requiredLevel;

  return {
    disabled: !hasAccess,
    title: hasAccess 
      ? undefined 
      : `Niveau "${PERMISSION_LEVEL_LABELS[requiredLevel]}" requis`,
    className: hasAccess ? '' : 'opacity-50 cursor-not-allowed'
  };
}

/**
 * Badge indicateur de niveau de permission
 */
export function PermissionLevelBadge({ level }: { level: number }) {
  const colors: Record<number, string> = {
    0: 'bg-muted text-muted-foreground',
    1: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    2: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    3: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    4: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colors[level] || colors[0]}`}>
      <Shield className="w-3 h-3" />
      {PERMISSION_LEVEL_LABELS[level] || 'Inconnu'}
    </span>
  );
}
