import { memo } from 'react';
import { GlobalRole, GLOBAL_ROLES, GLOBAL_ROLE_LABELS } from '@/types/globalRoles';
import { MODULE_DEFINITIONS, EnabledModules, ModuleKey, canAccessModule } from '@/types/modules';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Info, ChevronDown, Lock, Eye, ShieldCheck, Briefcase, Truck, 
  HelpCircle, Lightbulb, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface UserModulesTabProps {
  enabledModules: EnabledModules | null;
  userRole: GlobalRole | null;
  canEdit: boolean;
  onModuleToggle: (moduleKey: ModuleKey, enabled: boolean) => void;
  onModuleOptionToggle: (moduleKey: ModuleKey, optionKey: string, enabled: boolean) => void;
}

// Labels et descriptions enrichis pour les options RH
const RH_OPTION_LABELS: Record<string, { 
  label: string; 
  description: string; 
  icon: React.ReactNode;
  fullDescription: string;
  targetUsers: string;
}> = {
  coffre: {
    label: 'Mon Coffre RH',
    description: 'Accès personnel aux documents RH',
    icon: <Lock className="w-4 h-4 text-helpconfort-blue" />,
    fullDescription: 'Permet de consulter ses propres bulletins de paie, contrats, attestations et de faire des demandes de documents.',
    targetUsers: 'Tous les collaborateurs de l\'agence',
  },
  rh_viewer: {
    label: 'Gestionnaire RH',
    description: 'Gestion des documents équipe',
    icon: <Eye className="w-4 h-4 text-amber-500" />,
    fullDescription: 'Voir et traiter les documents et demandes RH de l\'équipe. Pas d\'accès aux informations de paie sensibles.',
    targetUsers: 'Assistantes RH, managers',
  },
  rh_admin: {
    label: 'Admin RH Complet',
    description: 'Contrôle total RH & Paie',
    icon: <ShieldCheck className="w-4 h-4 text-destructive" />,
    fullDescription: 'Accès complet : salaires, contrats, paramètres paie, exports comptables. Niveau le plus élevé.',
    targetUsers: 'Dirigeants, responsables paie',
  },
};

// Mapping rôle global → options RH autorisées (hard constraint)
const RH_OPTIONS_BY_ROLE: Record<GlobalRole, string[]> = {
  base_user: ['coffre'],
  franchisee_user: ['coffre'],
  franchisee_admin: ['coffre', 'rh_viewer', 'rh_admin'],
  franchisor_user: ['coffre', 'rh_viewer', 'rh_admin'],
  franchisor_admin: ['coffre', 'rh_viewer', 'rh_admin'],
  platform_admin: ['coffre', 'rh_viewer', 'rh_admin'],
  superadmin: ['coffre', 'rh_viewer', 'rh_admin'],
};

function isRhOptionAllowedForRole(userRole: GlobalRole | null, optionKey: string): boolean {
  if (!userRole) return false;
  return RH_OPTIONS_BY_ROLE[userRole]?.includes(optionKey) ?? false;
}

// Composant d'info-bulle enrichi
function ModuleInfoBadge({ 
  type, 
  message 
}: { 
  type: 'info' | 'warning' | 'success' | 'error'; 
  message: string 
}) {
  const config = {
    info: { icon: <Info className="w-3.5 h-3.5" />, className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' },
    warning: { icon: <AlertCircle className="w-3.5 h-3.5" />, className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
    success: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, className: 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300' },
    error: { icon: <XCircle className="w-3.5 h-3.5" />, className: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300' },
  };
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs ${config[type].className}`}>
      {config[type].icon}
      <span>{message}</span>
    </div>
  );
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

  const rhModule = MODULE_DEFINITIONS.find(m => m.key === 'rh');
  const parcModule = MODULE_DEFINITIONS.find(m => m.key === 'parc');
  const otherModules = MODULE_DEFINITIONS.filter(m => m.key !== 'rh' && m.key !== 'parc');

  return (
    <div className="space-y-6">
      {/* En-tête explicatif */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Comment ça marche ?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span>
              <span><strong>Activez un module</strong> avec le switch pour donner accès à une fonctionnalité</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span>
              <span><strong>Cochez les options</strong> pour préciser le niveau d'accès dans ce module</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">3.</span>
              <span>Certaines options nécessitent un <strong>rôle minimum</strong> (indiqué en gris si non disponible)</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Module RH - Section principale */}
      {rhModule && (
        <Card className={`transition-all duration-200 ${
          isModuleEnabled('rh') ? 'border-helpconfort-blue/30 shadow-sm' : 'border-muted'
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isModuleEnabled('rh') ? 'bg-helpconfort-blue/10' : 'bg-muted'}`}>
                  <Briefcase className={`w-5 h-5 ${isModuleEnabled('rh') ? 'text-helpconfort-blue' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Ressources Humaines
                    {isModuleEnabled('rh') && (
                      <Badge variant="default" className="bg-helpconfort-blue text-xs">Actif</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Documents RH, bulletins de paie, demandes collaborateurs
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={isModuleEnabled('rh')}
                onCheckedChange={(checked) => onModuleToggle('rh', checked)}
                disabled={!canEdit || !canAccessModule(userRole, 'rh')}
                className="scale-110"
              />
            </div>
            {!canAccessModule(userRole, 'rh') && (
              <ModuleInfoBadge 
                type="warning" 
                message={`Ce module nécessite le rôle ${GLOBAL_ROLE_LABELS[rhModule.minRole]} minimum`} 
              />
            )}
          </CardHeader>

          {isModuleEnabled('rh') && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Choisissez le niveau d'accès approprié :
                </p>
                
                <div className="grid gap-3">
                  {rhModule.options.map(opt => {
                    const rhLabel = RH_OPTION_LABELS[opt.key];
                    const isChecked = isOptionEnabled('rh', opt.key);
                    const isAllowed = isRhOptionAllowedForRole(userRole, opt.key);
                    const isDisabled = !canEdit || !isAllowed;
                    
                    return (
                      <div 
                        key={opt.key}
                        className={`relative rounded-lg border-2 p-4 transition-all cursor-pointer ${
                          isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/40'
                        } ${
                          isChecked && isAllowed 
                            ? 'border-helpconfort-blue bg-helpconfort-blue/5' 
                            : 'border-muted bg-background'
                        }`}
                        onClick={() => !isDisabled && onModuleOptionToggle('rh', opt.key, !isChecked)}
                      >
                        <div className="flex items-start gap-4">
                          <Checkbox
                            id={`rh-opt-${opt.key}`}
                            checked={isChecked && isAllowed}
                            onCheckedChange={(checked) => onModuleOptionToggle('rh', opt.key, !!checked)}
                            disabled={isDisabled}
                            className="mt-1"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {rhLabel?.icon}
                              <span className="font-semibold text-sm">{rhLabel?.label || opt.label}</span>
                              {!isAllowed && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  Rôle N2+ requis
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {rhLabel?.fullDescription || opt.description}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="font-medium">Pour :</span>
                              <span className="bg-muted px-2 py-0.5 rounded">{rhLabel?.targetUsers}</span>
                            </div>
                          </div>
                          {isChecked && isAllowed && (
                            <CheckCircle2 className="w-5 h-5 text-helpconfort-blue shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Module Parc */}
      {parcModule && (
        <Card className={`transition-all duration-200 ${
          isModuleEnabled('parc') ? 'border-helpconfort-orange/30 shadow-sm' : 'border-muted'
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isModuleEnabled('parc') ? 'bg-helpconfort-orange/10' : 'bg-muted'}`}>
                  <Truck className={`w-5 h-5 ${isModuleEnabled('parc') ? 'text-helpconfort-orange' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Parc & Équipements
                    {isModuleEnabled('parc') && (
                      <Badge className="bg-helpconfort-orange text-xs">Actif</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Véhicules, EPI, matériel et équipements
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={isModuleEnabled('parc')}
                onCheckedChange={(checked) => onModuleToggle('parc', checked)}
                disabled={!canEdit || !canAccessModule(userRole, 'parc')}
                className="scale-110"
              />
            </div>
            {!canAccessModule(userRole, 'parc') && (
              <ModuleInfoBadge 
                type="warning" 
                message={`Ce module nécessite le rôle ${GLOBAL_ROLE_LABELS[parcModule.minRole]} minimum`} 
              />
            )}
          </CardHeader>

          {isModuleEnabled('parc') && (
            <CardContent className="pt-0">
              <div className="grid gap-2">
                {parcModule.options.map(opt => {
                  const isChecked = isOptionEnabled('parc', opt.key);
                  return (
                    <div 
                      key={opt.key}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:border-primary/40 ${
                        isChecked ? 'border-helpconfort-orange/30 bg-helpconfort-orange/5' : 'border-muted'
                      }`}
                      onClick={() => canEdit && onModuleOptionToggle('parc', opt.key, !isChecked)}
                    >
                      <Checkbox
                        id={`parc-opt-${opt.key}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => onModuleOptionToggle('parc', opt.key, !!checked)}
                        disabled={!canEdit}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <label htmlFor={`parc-opt-${opt.key}`} className="text-sm font-medium cursor-pointer">
                          {opt.label}
                        </label>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </div>
                      {isChecked && <CheckCircle2 className="w-4 h-4 text-helpconfort-orange shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Autres modules - Collapsible */}
      <Collapsible defaultOpen>
        <Card>
          <CardHeader className="pb-2">
            <CollapsibleTrigger className="flex items-center justify-between w-full group">
              <CardTitle className="text-base flex items-center gap-2">
                <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                Autres modules
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {otherModules.filter(m => isModuleEnabled(m.key)).length} / {otherModules.length} actifs
              </Badge>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-2">
              <div className="grid gap-3">
                {otherModules.map(moduleDef => {
                  const isEnabled = isModuleEnabled(moduleDef.key);
                  const options = getModuleOptions(moduleDef.key);
                  const canUserAccessModule = canAccessModule(userRole, moduleDef.key);
                  const isModuleDisabled = !canEdit || !canUserAccessModule;

                  return (
                    <div 
                      key={moduleDef.key} 
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isEnabled 
                          ? 'bg-primary/5 border-primary/20' 
                          : canUserAccessModule 
                            ? 'bg-background border-muted hover:border-muted-foreground/30' 
                            : 'bg-muted/30 border-muted opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium ${!canUserAccessModule ? 'text-muted-foreground' : ''}`}>
                              {moduleDef.label}
                            </span>
                            {isEnabled && <Badge variant="secondary" className="text-xs">Actif</Badge>}
                            {!canUserAccessModule && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    <Lock className="w-3 h-3 mr-1" />
                                    N{GLOBAL_ROLES[moduleDef.minRole]}+
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Nécessite le rôle {GLOBAL_ROLE_LABELS[moduleDef.minRole]} minimum
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{moduleDef.description}</p>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => onModuleToggle(moduleDef.key, checked)}
                          disabled={isModuleDisabled}
                        />
                      </div>

                      {/* Options du module */}
                      {isEnabled && moduleDef.options.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-dashed space-y-2">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Options :</p>
                          {moduleDef.options.map(opt => {
                            const isOptChecked = options[opt.key] ?? opt.defaultEnabled;
                            return (
                              <div 
                                key={opt.key} 
                                className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                                  isOptChecked ? 'bg-primary/10' : 'hover:bg-muted/50'
                                }`}
                                onClick={() => canEdit && onModuleOptionToggle(moduleDef.key, opt.key, !isOptChecked)}
                              >
                                <Checkbox
                                  id={`${moduleDef.key}-${opt.key}`}
                                  checked={isOptChecked}
                                  onCheckedChange={(checked) => onModuleOptionToggle(moduleDef.key, opt.key, !!checked)}
                                  disabled={!canEdit}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex-1">
                                  <label htmlFor={`${moduleDef.key}-${opt.key}`} className="text-sm cursor-pointer">
                                    {opt.label}
                                  </label>
                                </div>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">{opt.description}</TooltipContent>
                                </Tooltip>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
});