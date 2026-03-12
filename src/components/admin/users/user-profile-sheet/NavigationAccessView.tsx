/**
 * NavigationAccessView — Vue A de la fiche utilisateur
 *
 * Affiche la structure de navigation réelle de l'application
 * avec des indicateurs d'accès (✅ accessible / 🔒 non accessible).
 *
 * Phase 9c — Alignement sur la navigation admin.
 */

import { CheckCircle2, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { GlobalRole } from '@/types/globalRoles';
import {
  NAVIGATION_STRUCTURE,
  ADMIN_ROLES,
  evaluateGuard,
  type NavigationDomain,
} from '@/lib/navigationStructure';

interface NavigationAccessViewProps {
  effectiveModules: Record<string, { enabled?: boolean; options?: Record<string, boolean> }>;
  globalRole: GlobalRole | null;
}

export function NavigationAccessView({ effectiveModules, globalRole }: NavigationAccessViewProps) {
  const isAdminBypass = !!globalRole && ADMIN_ROLES.includes(globalRole);

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
          />
        ))}
      </div>
    </div>
  );
}

function DomainCard({
  domain,
  effectiveModules,
  globalRole,
  isAdminBypass,
}: {
  domain: NavigationDomain;
  effectiveModules: Record<string, { enabled?: boolean; options?: Record<string, boolean> }>;
  globalRole: GlobalRole | null;
  isAdminBypass: boolean;
}) {
  const Icon = domain.icon;

  const entriesWithAccess = domain.entries.map(entry => ({
    ...entry,
    accessible: evaluateGuard(entry.guard, effectiveModules, globalRole, isAdminBypass),
  }));

  const accessibleCount = entriesWithAccess.filter(e => e.accessible).length;
  const totalCount = entriesWithAccess.length;
  const allAccessible = accessibleCount === totalCount;
  const noneAccessible = accessibleCount === 0;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Domain header */}
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
              {entry.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
