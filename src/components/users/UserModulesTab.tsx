import { memo } from 'react';
import { GlobalRole, GLOBAL_ROLES, GLOBAL_ROLE_LABELS } from '@/types/globalRoles';
import { MODULE_DEFINITIONS, EnabledModules, ModuleKey, canAccessModule } from '@/types/modules';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Info, ChevronDown, Lock, Briefcase, FileText, Eye, ShieldCheck } from 'lucide-react';

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
  parc: {
    label: 'Parc',
    description: 'Gestion flotte véhicules, EPI, équipements',
    icon: <FileText className="w-4 h-4 text-green-500" />,
  },
};

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

  // Séparer le module RH des autres
  const rhModule = MODULE_DEFINITIONS.find(m => m.key === 'rh_parc');
  const otherModules = MODULE_DEFINITIONS.filter(m => m.key !== 'rh_parc');

  return (
    <div className="space-y-6">
      {/* Module RH & Parc - Section dédiée */}
      {rhModule && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">RH & Parc</h3>
            {!canAccessModule(userRole, 'rh_parc') && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Rôle insuffisant
              </Badge>
            )}
          </div>
          
          <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
            <div className="flex items-center gap-3">
              <Switch
                checked={isModuleEnabled('rh_parc')}
                onCheckedChange={(checked) => onModuleToggle('rh_parc', checked)}
                disabled={!canEdit || !canAccessModule(userRole, 'rh_parc')}
              />
              <span className="text-sm font-medium">Activer le module RH & Parc</span>
            </div>

            {isModuleEnabled('rh_parc') && (
              <div className="pl-4 space-y-3 border-l-2 border-primary/30">
                <p className="text-xs text-muted-foreground mb-3">
                  Sélectionnez les niveaux d'accès pour cet utilisateur :
                </p>
                
                {rhModule.options.map(opt => {
                  const rhLabel = RH_OPTION_LABELS[opt.key];
                  const isChecked = isOptionEnabled('rh_parc', opt.key);
                  
                  return (
                    <div 
                      key={opt.key} 
                      className={`flex items-start gap-3 p-3 rounded-md transition-colors ${
                        isChecked ? 'bg-primary/5 border border-primary/20' : 'bg-background border border-transparent hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        id={`rh-opt-${opt.key}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => onModuleOptionToggle('rh_parc', opt.key, !!checked)}
                        disabled={!canEdit}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-1">
                        <label 
                          htmlFor={`rh-opt-${opt.key}`}
                          className="flex items-center gap-2 font-medium text-sm cursor-pointer"
                        >
                          {rhLabel?.icon}
                          {rhLabel?.label || opt.label}
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
