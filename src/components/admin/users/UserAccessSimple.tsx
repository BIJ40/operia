/**
 * Phase 3 - Composant simplifié d'affichage des accès utilisateur
 * Remplace la matrice complexe par une vue épurée
 * Affiche un badge "Protégé" pour les utilisateurs de la whitelist
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Shield, Building2, Zap, Lock } from 'lucide-react';
import { GlobalRole } from '@/types/globalRoles';
import { EnabledModules, MODULE_DEFINITIONS } from '@/types/modules';
import { getVisibleRoleLabel, getVisibleRoleColor } from '@/lib/visibleRoleLabels';
import { isHardcodedProtectedUser } from '@/hooks/access-rights/useProtectedAccess';

interface UserAccessSimpleProps {
  userId: string;
  globalRole: GlobalRole | null;
  agencyLabel?: string | null;
  enabledModules: EnabledModules | null;
  planLabel?: string | null;
  isProtected?: boolean;
}

/**
 * Compte les modules actifs
 */
function countActiveModules(modules: EnabledModules | null): number {
  if (!modules) return 0;
  return Object.values(modules).filter(m => 
    (typeof m === 'boolean' && m) || (typeof m === 'object' && m?.enabled)
  ).length;
}

/**
 * Liste les modules actifs avec leurs labels
 */
function getActiveModuleLabels(modules: EnabledModules | null): string[] {
  if (!modules) return [];
  
  return MODULE_DEFINITIONS
    .filter(def => {
      const state = modules[def.key];
      return (typeof state === 'boolean' && state) || (typeof state === 'object' && state?.enabled);
    })
    .map(def => def.label);
}

export function UserAccessSimple({
  userId,
  globalRole,
  agencyLabel,
  enabledModules,
  planLabel,
  isProtected: isProtectedProp,
}: UserAccessSimpleProps) {
  // Vérifier si l'utilisateur est dans la whitelist de protection
  const isProtected = isProtectedProp ?? isHardcodedProtectedUser(userId);
  const activeModuleCount = countActiveModules(enabledModules);
  const activeModuleLabels = getActiveModuleLabels(enabledModules);

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="p-4 space-y-4">
        {/* Badge protégé si applicable */}
        {isProtected && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 border border-amber-200">
            <Lock className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              Accès protégé
            </span>
            <Badge variant="outline" className="ml-auto text-amber-600 border-amber-300">
              Verrouillé
            </Badge>
          </div>
        )}

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

        {/* Ligne 4: Modules */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4" />
              Modules activés
            </div>
            <Badge variant="outline">{activeModuleCount}</Badge>
          </div>
          
          {activeModuleCount > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {activeModuleLabels.map(label => (
                <Badge 
                  key={label} 
                  variant="secondary" 
                  className="text-xs"
                >
                  {label}
                </Badge>
              ))}
            </div>
          )}
          
          {activeModuleCount === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Aucun module individuel activé (utilise les modules du plan agence)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
