import { memo } from 'react';
import { GlobalRole, GLOBAL_ROLES, GLOBAL_ROLE_LABELS } from '@/types/globalRoles';
import { MODULE_DEFINITIONS, EnabledModules, ModuleKey, canAccessModule } from '@/types/modules';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Info, ChevronDown, Lock, Eye, ShieldCheck, Briefcase, Truck } from 'lucide-react';

interface UserModulesTabProps {
  enabledModules: EnabledModules | null;
  userRole: GlobalRole | null;
  canEdit: boolean;
  onModuleToggle: (moduleKey: ModuleKey, enabled: boolean) => void;
  onModuleOptionToggle: (moduleKey: ModuleKey, optionKey: string, enabled: boolean) => void;
}

// Labels spéciaux pour les options RH
const RH_OPTION_LABELS: Record<string, { label: string; description: string; icon: React.ReactNode }> = {
  coffre: {
    label: 'Mon Coffre RH',
    description: 'Accès à ses propres documents RH et demandes personnelles',
    icon: <Lock className="w-4 h-4 text-blue-500" />,
  },
  rh_viewer: {
    label: 'Gestionnaire RH',
    description: 'Voir/traiter les documents et demandes RH de l\'équipe (sans accès paie)',
    icon: <Eye className="w-4 h-4 text-amber-500" />,
  },
  rh_admin: {
    label: 'Admin RH',
    description: 'Gestion complète : salaires, contrats, paramètres paie, exports',
    icon: <ShieldCheck className="w-4 h-4 text-red-500" />,
  },
};

// Mapping rôle global → options RH autorisées (hard constraint)
const RH_OPTIONS_BY_ROLE: Record<GlobalRole, string[]> = {
  base_user: ['coffre'], // N0 - Seulement coffre perso
  franchisee_user: ['coffre'], // N1 - Salarié agence = coffre uniquement
  franchisee_admin: ['coffre', 'rh_viewer', 'rh_admin'], // N2 - Dirigeant = tout
  franchisor_user: ['coffre', 'rh_viewer', 'rh_admin'], // N3+
  franchisor_admin: ['coffre', 'rh_viewer', 'rh_admin'], // N4+
  platform_admin: ['coffre', 'rh_viewer', 'rh_admin'], // N5+
  superadmin: ['coffre', 'rh_viewer', 'rh_admin'], // N6
};

// Vérifie si une option RH est autorisée pour ce rôle
function isRhOptionAllowedForRole(userRole: GlobalRole | null, optionKey: string): boolean {
  if (!userRole) return false;
  return RH_OPTIONS_BY_ROLE[userRole]?.includes(optionKey) ?? false;
}

export const UserModulesTab = memo(function UserModulesTab({
  enabledModules,
  userRole,
  canEdit,
  onModuleToggle,
  onModuleOptionToggle,
}: UserModulesTabProps) {
  const isModuleEnabled = (moduleKey: ModuleKey): boolean => {
    if (!enabledModules) return false;
    const state = enabledModules[moduleKey];
    if (typeof state === 'boolean') return state;
    if (typeof state === 'object') return state.enabled;
    return false;
  };

  const getModuleOptions = (moduleKey: ModuleKey): Record<string, boolean> => {
    if (!enabledModules) return {};
    const state = enabledModules[moduleKey];
    if (typeof state === 'object' && state.options) return state.options;
    return {};
  };

  const isOptionEnabled = (moduleKey: ModuleKey, optionKey: string): boolean => {
    const options = getModuleOptions(moduleKey);
    const moduleDef = MODULE_DEFINITIONS.find(m => m.key === moduleKey);
    const optionDef = moduleDef?.options.find(o => o.key === optionKey);
    return options[optionKey] ?? optionDef?.defaultEnabled ?? false;
  };

  // Séparer les modules RH/Parc des autres
  const rhModule = MODULE_DEFINITIONS.find(m => m.key === 'rh');
  const parcModule = MODULE_DEFINITIONS.find(m => m.key === 'parc');
  const otherModules = MODULE_DEFINITIONS.filter(m => m.key !== 'rh' && m.key !== 'parc');

  return (
    <div className="space-y-6">
      {/* Module RH - Section dédiée */}
      {rhModule && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Ressources Humaines</h3>
            {!canAccessModule(userRole, 'rh') && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Rôle insuffisant
              </Badge>
            )}
          </div>
          
          <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
            <div className="flex items-center gap-3">
              <Switch
                checked={isModuleEnabled('rh')}
                onCheckedChange={(checked) => onModuleToggle('rh', checked)}
                disabled={!canEdit || !canAccessModule(userRole, 'rh')}
              />
              <span className="text-sm font-medium">Activer le module RH</span>
            </div>

            {isModuleEnabled('rh') && (
              <div className="pl-4 space-y-3 border-l-2 border-primary/30">
                <p className="text-xs text-muted-foreground mb-3">
                  Sélectionnez les niveaux d'accès pour cet utilisateur :
                </p>
                
                {rhModule.options.map(opt => {
                  const rhLabel = RH_OPTION_LABELS[opt.key];
                  const isChecked = isOptionEnabled('rh', opt.key);
                  const isAllowed = isRhOptionAllowedForRole(userRole, opt.key);
                  const isDisabled = !canEdit || !isAllowed;
                  
                  return (
                    <div 
                      key={opt.key} 
                      className={`flex items-start gap-3 p-3 rounded-md transition-colors ${
                        isChecked && isAllowed 
                          ? 'bg-primary/5 border border-primary/20' 
                          : isAllowed 
                            ? 'bg-background border border-transparent hover:bg-muted/50'
                            : 'bg-muted/30 border border-muted opacity-50'
                      }`}
                    >
                      <Checkbox
                        id={`rh-opt-${opt.key}`}
                        checked={isChecked && isAllowed}
                        onCheckedChange={(checked) => onModuleOptionToggle('rh', opt.key, !!checked)}
                        disabled={isDisabled}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-1">
                        <label 
                          htmlFor={`rh-opt-${opt.key}`}
                          className={`flex items-center gap-2 font-medium text-sm ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {rhLabel?.icon}
                          {rhLabel?.label || opt.label}
                          {!isAllowed && (
                            <Badge variant="outline" className="text-xs text-destructive ml-2">
                              Rôle N{GLOBAL_ROLES.franchisee_admin}+ requis
                            </Badge>
                          )}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {rhLabel?.description || opt.description}
                        </p>
                      </div>
                    </div>
                  );
                })}

                <div className="mt-2 p-2 rounded bg-blue-50 dark:bg-blue-950/30 text-xs text-blue-700 dark:text-blue-300">
                  <strong>Mapping recommandé :</strong>
                  <ul className="mt-1 ml-4 list-disc space-y-0.5">
                    <li>Salariés (technicien, assistante, commercial) → <strong>Mon Coffre RH</strong> uniquement</li>
                    <li>Assistante RH / Gestionnaire → <strong>Gestionnaire RH</strong></li>
                    <li>Dirigeant / Responsable paie → <strong>Admin RH</strong></li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Module Parc - Section dédiée */}
      {parcModule && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Parc & Équipements</h3>
            {!canAccessModule(userRole, 'parc') && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Rôle insuffisant
              </Badge>
            )}
          </div>
          
          <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
            <div className="flex items-center gap-3">
              <Switch
                checked={isModuleEnabled('parc')}
                onCheckedChange={(checked) => onModuleToggle('parc', checked)}
                disabled={!canEdit || !canAccessModule(userRole, 'parc')}
              />
              <span className="text-sm font-medium">Activer le module Parc</span>
            </div>

            {isModuleEnabled('parc') && (
              <div className="pl-4 space-y-2 border-l-2 border-primary/30">
                {parcModule.options.map(opt => (
                  <div key={opt.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`parc-opt-${opt.key}`}
                      checked={isOptionEnabled('parc', opt.key)}
                      onCheckedChange={(checked) => onModuleOptionToggle('parc', opt.key, !!checked)}
                      disabled={!canEdit}
                    />
                    <label 
                      htmlFor={`parc-opt-${opt.key}`}
                      className="text-sm cursor-pointer"
                    >
                      {opt.label}
                    </label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>{opt.description}</TooltipContent>
                    </Tooltip>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Autres modules */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center gap-2 w-full font-semibold hover:text-primary">
          <ChevronDown className="w-4 h-4" />
          Autres modules
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="grid grid-cols-1 gap-3">
            {otherModules.map(moduleDef => {
              const isEnabled = isModuleEnabled(moduleDef.key);
              const options = getModuleOptions(moduleDef.key);
              const canUserAccessModule = canAccessModule(userRole, moduleDef.key);
              const isModuleDisabled = !canEdit || !canUserAccessModule;

              return (
                <div 
                  key={moduleDef.key} 
                  className={`p-3 rounded-lg border ${
                    isEnabled 
                      ? 'bg-primary/5 border-primary/20' 
                      : canUserAccessModule 
                        ? 'bg-muted/30 border-muted' 
                        : 'bg-muted/50 border-destructive/30 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => onModuleToggle(moduleDef.key, checked)}
                              disabled={isModuleDisabled}
                            />
                          </div>
                        </TooltipTrigger>
                        {!canUserAccessModule && (
                          <TooltipContent>
                            Nécessite le rôle {GLOBAL_ROLE_LABELS[moduleDef.minRole]} (N{GLOBAL_ROLES[moduleDef.minRole]}) minimum
                          </TooltipContent>
                        )}
                      </Tooltip>
                      <div>
                        <span className={`text-sm font-medium ${!canUserAccessModule ? 'text-muted-foreground' : ''}`}>
                          {moduleDef.label}
                        </span>
                        <p className="text-xs text-muted-foreground">{moduleDef.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Options du module */}
                  {isEnabled && moduleDef.options.length > 0 && (
                    <div className="mt-3 pl-12 space-y-2 border-t pt-3">
                      {moduleDef.options.map(opt => (
                        <div key={opt.key} className="flex items-center gap-2">
                          <Checkbox
                            id={`${moduleDef.key}-${opt.key}`}
                            checked={options[opt.key] ?? opt.defaultEnabled}
                            onCheckedChange={(checked) => onModuleOptionToggle(moduleDef.key, opt.key, !!checked)}
                            disabled={!canEdit}
                          />
                          <label 
                            htmlFor={`${moduleDef.key}-${opt.key}`}
                            className="text-sm cursor-pointer"
                          >
                            {opt.label}
                          </label>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3 h-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>{opt.description}</TooltipContent>
                          </Tooltip>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
});
