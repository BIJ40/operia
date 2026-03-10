/**
 * Phase 3 - Composant simplifié d'affichage des accès utilisateur
 * Affiche les modules effectifs (RPC) avec leurs sous-options activées.
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Shield, Building2, Zap } from 'lucide-react';
import { GlobalRole } from '@/types/globalRoles';
import { EnabledModules, MODULE_DEFINITIONS, ModuleKey } from '@/types/modules';
import { getVisibleRoleLabel, getVisibleRoleColor } from '@/lib/visibleRoleLabels';

interface UserAccessSimpleProps {
  userId: string;
  globalRole: GlobalRole | null;
  agencyLabel?: string | null;
  enabledModules: EnabledModules | null;
  planLabel?: string | null;
}

interface ActiveModule {
  key: ModuleKey;
  label: string;
  activeOptions: string[];
}

/**
 * Liste les modules actifs avec leurs labels ET sous-options
 */
function getActiveModulesWithOptions(modules: EnabledModules | null): ActiveModule[] {
  if (!modules) return [];

  return MODULE_DEFINITIONS
    .filter(def => {
      const state = modules[def.key];
      return (typeof state === 'boolean' && state) || (typeof state === 'object' && state?.enabled);
    })
    .map(def => {
      const state = modules[def.key];
      const activeOptions: string[] = [];

      if (typeof state === 'object' && state?.options && def.options.length > 0) {
        for (const optDef of def.options) {
          if (state.options[optDef.key]) {
            activeOptions.push(optDef.label);
          }
        }
      }

      return {
        key: def.key,
        label: def.label,
        activeOptions,
      };
    });
}

export function UserAccessSimple({
  userId,
  globalRole,
  agencyLabel,
  enabledModules,
  planLabel,
}: UserAccessSimpleProps) {
  const activeModules = getActiveModulesWithOptions(enabledModules);

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="p-4 space-y-4">
        {/* Ligne 1: Rôle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            Rôle
          </div>
          <Badge className={getVisibleRoleColor(globalRole)}>
            {getVisibleRoleLabel(globalRole)}
          </Badge>
        </div>

        <Separator />

        {/* Ligne 2: Agence */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            Agence
          </div>
          {agencyLabel ? (
            <span className="text-sm font-medium">{agencyLabel}</span>
          ) : (
            <span className="text-sm text-muted-foreground italic">Aucune</span>
          )}
        </div>

        {/* Ligne 3: Plan (si agence) */}
        {agencyLabel && planLabel && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Plan
            </div>
            <Badge variant={planLabel === 'PRO' ? 'default' : 'secondary'}>
              {planLabel}
            </Badge>
          </div>
        )}

        <Separator />

        {/* Ligne 4: Modules avec sous-options */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4" />
              Modules activés
            </div>
            <Badge variant="outline">{activeModules.length}</Badge>
          </div>
          
          {activeModules.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              {activeModules.map(mod => (
                <div key={mod.key}>
                  <Badge variant="secondary" className="text-xs">
                    {mod.label}
                  </Badge>
                  {mod.activeOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 ml-3">
                      {mod.activeOptions.map(opt => (
                        <Badge key={opt} variant="outline" className="text-[10px] text-muted-foreground">
                          {opt}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Aucun module individuel activé (utilise les modules du plan agence)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
