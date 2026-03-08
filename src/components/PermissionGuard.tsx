import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/contexts/PermissionsContext';
import { GlobalRole, hasMinimumRole } from '@/types/globalRoles';
import { VISIBLE_ROLE_LABELS } from '@/lib/visibleRoleLabels';
import { Shield, Lock } from 'lucide-react';

interface PermissionGuardProps {
  minRole?: GlobalRole;
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
  showAccessDenied?: boolean;
}

/**
 * Guard de permission V2 basé sur global_role
 */
export function PermissionGuard({
  minRole,
  children,
  fallback,
  redirectTo,
  showAccessDenied = true
}: PermissionGuardProps) {
  const { globalRole, isAdmin } = usePermissions();
  
  const hasAccess = isAdmin || !minRole || hasMinimumRole(globalRole, minRole);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

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
        {minRole && (
          <p className="text-sm text-muted-foreground mt-2">
            Niveau requis : <span className="font-medium">{VISIBLE_ROLE_LABELS[minRole]}</span>
          </p>
        )}
      </div>
    );
  }

  return null;
}

interface ConditionalRenderProps {
  minRole?: GlobalRole;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Rendu conditionnel basé sur global_role V2
 */
export function ConditionalRender({
  minRole,
  children,
  fallback = null
}: ConditionalRenderProps) {
  const { globalRole, isAdmin } = usePermissions();
  
  const hasAccess = isAdmin || !minRole || hasMinimumRole(globalRole, minRole);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Hook pour vérifier l'accès basé sur le rôle
 */
export function useRoleAccess(minRole?: GlobalRole): boolean {
  const { globalRole, isAdmin } = usePermissions();
  return isAdmin || !minRole || hasMinimumRole(globalRole, minRole);
}

/**
 * Badge indicateur de rôle
 */
export function RoleBadge({ role }: { role: GlobalRole }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
      <Shield className="w-3 h-3" />
      {VISIBLE_ROLE_LABELS[role] || role}
    </span>
  );
}
