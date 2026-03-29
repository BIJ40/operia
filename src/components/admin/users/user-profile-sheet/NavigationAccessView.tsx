/**
 * NavigationAccessView — Vue A de la fiche utilisateur
 *
 * Affiche la structure de navigation réelle de l'application
 * avec des indicateurs d'accès (✅ accessible / 🔒 non accessible).
 *
 * Les labels des entrées liées à un module sont résolus dynamiquement
 * via useModuleLabels (DB override > fallback compilé).
 * Les labels structurels (domaines, entrées admin/role-gated) restent statiques.
 */

import { CheckCircle2, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { GlobalRole } from '@/types/globalRoles';
import {
  NAVIGATION_STRUCTURE,
  ADMIN_ROLES,
  evaluateGuard,
  type NavigationDomain,
  type NavigationEntry,
} from '@/lib/navigationStructure';
import { useModuleLabels } from '@/hooks/useModuleLabels';
import { usePermissionsBridge as usePermissions } from '@/hooks/usePermissionsBridge';

interface NavigationAccessViewProps {
  effectiveModules: Record<string, { enabled?: boolean; options?: Record<string, boolean> }>;
  globalRole: GlobalRole | null;
}

export function NavigationAccessView({ effectiveModules, globalRole }: NavigationAccessViewProps) {
  const isAdminBypass = !!globalRole && ADMIN_ROLES.includes(globalRole);
  const { getLabel } = useModuleLabels();
  const { isDeployedModule } = usePermissions();

  // Filter domains: role-gated domains only shown if user has the role
  const visibleDomains = NAVIGATION_STRUCTURE.filter(domain => {
    if (!domain.roleGated) return true;
    return !!globalRole && domain.roleGated.includes(globalRole);
  });

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Sections et sous-onglets visibles par l'utilisateur dans l'application.
      </p>

      <div className="grid gap-3">
        {visibleDomains.map(domain => (
          <DomainCard
            key={domain.id}
            domain={domain}
            effectiveModules={effectiveModules}
            globalRole={globalRole}
            isAdminBypass={isAdminBypass}
            getLabel={getLabel}
            isDeployedModule={isDeployedModule}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Resolve the display label for a navigation entry.
 * Module-gated entries use DB labels; structural entries keep their static label.
 */
function resolveEntryLabel(
  entry: NavigationEntry,
  _getLabel: (key: string, fallback?: string) => string,
): string {
  // Always use the static label from NAVIGATION_STRUCTURE.
  // DB label resolution caused duplicates when multiple entries share
  // the same moduleKey (e.g. pilotage.agence → 4 entries all renamed "Mon agence").
  return entry.label;
}

function DomainCard({
  domain,
  effectiveModules,
  globalRole,
  isAdminBypass,
  getLabel,
  isDeployedModule,
}: {
  domain: NavigationDomain;
  effectiveModules: Record<string, { enabled?: boolean; options?: Record<string, boolean> }>;
  globalRole: GlobalRole | null;
  isAdminBypass: boolean;
  getLabel: (key: string, fallback?: string) => string;
  isDeployedModule: (key: string) => boolean;
}) {
  const Icon = domain.icon;

  const entriesWithAccess = domain.entries.map(entry => ({
    ...entry,
    resolvedLabel: resolveEntryLabel(entry, getLabel),
    accessible: evaluateGuard(entry.guard, effectiveModules, globalRole, isAdminBypass, isDeployedModule),
  }));

  const accessibleCount = entriesWithAccess.filter(e => e.accessible).length;
  const totalCount = entriesWithAccess.length;
  const allAccessible = accessibleCount === totalCount;
  const noneAccessible = accessibleCount === 0;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Domain header — structural label, not a module */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-muted/40">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{domain.label}</span>
        </div>
        <Badge
          variant={noneAccessible ? 'destructive' : 'secondary'}
          className={`text-[10px] px-1.5 py-0 ${allAccessible ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : ''}`}
        >
          {accessibleCount}/{totalCount}
        </Badge>
      </div>

      {/* Entries */}
      <div className="divide-y divide-border/50">
        {entriesWithAccess.map((entry, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm ${
              entry.accessible
                ? 'text-foreground'
                : 'text-muted-foreground/60'
            }`}
          >
            {entry.accessible ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            ) : (
              <Lock className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            )}
            <span className={entry.accessible ? '' : 'line-through decoration-muted-foreground/30'}>
              {entry.resolvedLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
