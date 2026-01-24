/**
 * Popover récapitulatif des accès d'un utilisateur
 * Affiche en un coup d'œil : rôle, agence, plan, modules, pages accessibles
 */

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Eye, Shield, Building2, Zap, FileText, Lock, Check, X } from 'lucide-react';
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { EnabledModules, MODULE_DEFINITIONS, ModuleKey } from '@/types/modules';
import { getVisibleRoleLabel, getVisibleRoleColor } from '@/lib/visibleRoleLabels';
import { isHardcodedProtectedUser } from '@/hooks/access-rights/useProtectedAccess';
import { cn } from '@/lib/utils';

interface UserAccessSummaryPopoverProps {
  userId: string;
  userName: string;
  globalRole: GlobalRole | null;
  agencyLabel?: string | null;
  enabledModules: EnabledModules | null;
  planLabel?: string | null;
}

/**
 * Vérifie si un module est activé
 */
function isModuleEnabled(modules: EnabledModules | null, key: ModuleKey): boolean {
  if (!modules) return false;
  const state = modules[key];
  return (typeof state === 'boolean' && state) || (typeof state === 'object' && state?.enabled);
}

/**
 * Vérifie si une option de module est activée
 */
function isModuleOptionEnabled(modules: EnabledModules | null, key: ModuleKey, optionKey: string): boolean {
  if (!modules) return false;
  const state = modules[key];
  if (typeof state !== 'object' || !state?.enabled) return false;
  return state.options?.[optionKey] ?? false;
}

/**
 * Modules "spéciaux" = accès individuels hors plan standard
 */
const SPECIAL_ACCESS_KEYS: { moduleKey: ModuleKey; optionKey?: string; label: string }[] = [
  { moduleKey: 'apogee_tickets', label: 'Gestion de Projet' },
  { moduleKey: 'support', optionKey: 'agent', label: 'Agent Support' },
  { moduleKey: 'help_academy', optionKey: 'edition', label: 'Contributeur FAQ' },
];

/**
 * Pages principales et leurs conditions d'accès
 */
const ACCESS_PAGES = [
  { label: 'Tableau de bord', minRole: 'base_user' as GlobalRole, module: null },
  { label: 'Support', minRole: 'base_user' as GlobalRole, module: 'support' as ModuleKey },
  { label: 'Help Academy', minRole: 'base_user' as GlobalRole, module: 'help_academy' as ModuleKey },
  { label: 'Pilotage Agence', minRole: 'agency_user' as GlobalRole, module: 'pilotage_agence' as ModuleKey },
  { label: 'RH', minRole: 'agency_user' as GlobalRole, module: 'rh' as ModuleKey },
  { label: 'Gestion de Projet', minRole: 'base_user' as GlobalRole, module: 'apogee_tickets' as ModuleKey },
  { label: 'Réseau Franchiseur', minRole: 'franchisor_user' as GlobalRole, module: 'reseau_franchiseur' as ModuleKey },
  { label: 'Administration', minRole: 'platform_admin' as GlobalRole, module: null },
];

export function UserAccessSummaryPopover({
  userId,
  userName,
  globalRole,
  agencyLabel,
  enabledModules,
  planLabel,
}: UserAccessSummaryPopoverProps) {
  const [open, setOpen] = useState(false);
  
  const isProtected = isHardcodedProtectedUser(userId);
  const userLevel = globalRole ? GLOBAL_ROLES[globalRole] ?? 0 : 0;
  
  // Calculer les accès effectifs aux pages
  const accessResults = ACCESS_PAGES.map(page => {
    const minLevel = GLOBAL_ROLES[page.minRole] ?? 0;
    const hasRoleLevel = userLevel >= minLevel;
    
    // Pour les modules, vérifier s'il est activé
    let hasModuleAccess = true;
    if (page.module) {
      hasModuleAccess = isModuleEnabled(enabledModules, page.module);
      // N5+ ont tous les modules
      if (userLevel >= GLOBAL_ROLES.platform_admin) {
        hasModuleAccess = true;
      }
    }
    
    return {
      ...page,
      hasAccess: hasRoleLevel && hasModuleAccess,
    };
  });

  // Compter les accès
  const accessCount = accessResults.filter(r => r.hasAccess).length;
  
  // Accès spéciaux activés
  const specialAccessLabels = SPECIAL_ACCESS_KEYS
    .filter(sa => {
      if (sa.optionKey) {
        return isModuleOptionEnabled(enabledModules, sa.moduleKey, sa.optionKey);
      }
      return isModuleEnabled(enabledModules, sa.moduleKey);
    })
    .map(sa => sa.label);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          title="Voir les accès"
        >
          <Eye className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{userName}</span>
            {isProtected && (
              <Badge variant="outline" className="text-warning border-warning/50 gap-1">
                <Lock className="h-3 w-3" />
                Protégé
              </Badge>
            )}
          </div>
        </div>
        
        <div className="p-3 space-y-3">
          {/* Rôle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              Rôle
            </div>
            <Badge className={getVisibleRoleColor(globalRole)} variant="secondary">
              {getVisibleRoleLabel(globalRole)}
            </Badge>
          </div>

          {/* Agence + Plan */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Agence
            </div>
            <div className="flex items-center gap-2">
              {agencyLabel ? (
                <>
                  <span className="text-sm">{agencyLabel}</span>
                  {planLabel && (
                    <Badge 
                      variant={planLabel === 'PRO' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {planLabel}
                    </Badge>
                  )}
                </>
              ) : (
                <span className="text-sm text-muted-foreground italic">—</span>
              )}
            </div>
          </div>

          {/* Accès spéciaux */}
          {specialAccessLabels.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" />
                Accès spéciaux
              </div>
              <div className="flex flex-wrap gap-1">
                {specialAccessLabels.map(label => (
                  <Badge key={label} variant="secondary" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Pages accessibles */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              Pages accessibles
              <Badge variant="outline" className="ml-auto text-xs">
                {accessCount}/{ACCESS_PAGES.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto">
              {accessResults.map(page => (
                <div 
                  key={page.label}
                  className={cn(
                    "flex items-center justify-between text-xs py-1 px-2 rounded",
                    page.hasAccess 
                      ? "bg-success/10 text-success-foreground" 
                      : "bg-muted/50 opacity-60"
                  )}
                >
                  <span>{page.label}</span>
                  {page.hasAccess ? (
                    <Check className="h-3 w-3 text-success" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
