import { memo } from 'react';
import { GlobalRole } from '@/types/globalRoles';
import { VISIBLE_ROLE_LABELS } from '@/lib/visibleRoleLabels';
import { MODULE_DEFINITIONS, EnabledModules, ModuleKey, canAccessModule } from '@/types/modules';
import { UserProfile } from '@/hooks/use-user-management';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, ChevronDown, Zap, Loader2 } from 'lucide-react';

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

interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile;
  effectiveRole: GlobalRole | null;
  effectiveModules: EnabledModules;
  canEdit: boolean;
  isSaving: boolean;
  isModified: boolean;
  onSaveChanges: () => void;
  onModuleToggle: (moduleKey: ModuleKey, enabled: boolean) => void;
  onModuleOptionToggle: (moduleKey: ModuleKey, optionKey: string, enabled: boolean) => void;
}

export const UserPermissionsDialog = memo(function UserPermissionsDialog({
  open,
  onOpenChange,
  user,
  effectiveRole,
  effectiveModules,
  canEdit,
  isSaving,
  isModified,
  onSaveChanges,
  onModuleToggle,
  onModuleOptionToggle,
}: UserPermissionsDialogProps) {
  const isModuleEnabled = (moduleKey: ModuleKey): boolean => {
    const state = effectiveModules[moduleKey];
    if (typeof state === 'boolean') return state;
    if (typeof state === 'object') return state.enabled;
    return false;
  };

  const getModuleOptions = (moduleKey: ModuleKey): Record<string, boolean> => {
    const state = effectiveModules[moduleKey];
    if (typeof state === 'object' && state.options) return state.options;
    return {};
  };

  const getDisplayName = () => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email || 'Utilisateur';
  };

  const handleSaveAndClose = () => {
    onSaveChanges();
    // On ferme après un court délai pour laisser le temps de voir le feedback
    setTimeout(() => {
      onOpenChange(false);
    }, 500);
  };

  // Couleurs par niveau d'accès
  const getOptionColors = (optionKey: string, optionEnabled: boolean, isEnabled: boolean) => {
    const baseOptions = ['coffre', 'user', 'kanban', 'apogee', 'apporteurs', 'helpconfort', 'base_documentaire', 'dm', 'docs', 'stats'];
    const intermediateOptions = ['rh_viewer', 'manage', 'agent', 'indicateurs', 'actions_a_mener', 'diffusion', 'dashboard', 'agences', 'comparatifs', 'groups', 'exports', 'vehicules', 'epi', 'equipements'];
    const adminOptions = ['rh_admin', 'import', 'admin', 'redevances', 'edition', 'users', 'agencies', 'permissions', 'backup', 'logs', 'faq_admin'];
    
    if (!optionEnabled || !isEnabled) {
      return 'bg-muted/50 border-muted/50 text-muted-foreground';
    }
    if (adminOptions.includes(optionKey)) {
      return 'bg-violet-50 border-violet-400 text-violet-900 dark:bg-violet-950/40 dark:border-violet-600 dark:text-violet-100';
    }
    if (intermediateOptions.includes(optionKey)) {
      return 'bg-blue-50 border-blue-400 text-blue-900 dark:bg-blue-950/40 dark:border-blue-600 dark:text-blue-100';
    }
    if (baseOptions.includes(optionKey)) {
      return 'bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-600 dark:text-emerald-100';
    }
    return 'bg-primary/10 border-primary/40';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Permissions de {getDisplayName()}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Permissions alignées par défaut sur le plan de l'agence. Ajustez les accès individuels ci-dessous.
          </p>
        </DialogHeader>

        <ScrollArea type="always" className="flex-1 min-h-0 -mx-6 px-6">
          <div className="space-y-3 py-4">
            {MODULE_DEFINITIONS.map(moduleDef => {
              const isEnabled = isModuleEnabled(moduleDef.key);
              const canUserAccessModuleByRole = canAccessModule(effectiveRole, moduleDef.key);
              // L'admin peut TOUJOURS éditer les permissions (override du plan)
              const isModuleDisabled = !canEdit;
              const moduleOptions = getModuleOptions(moduleDef.key);
              const hasOptions = moduleDef.options && moduleDef.options.length > 0;
              const isRhModule = moduleDef.key === 'rh';

              const handleModuleClick = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isModuleDisabled) {
                  onModuleToggle(moduleDef.key, !isEnabled);
                }
              };

              return (
                <Collapsible key={moduleDef.key} defaultOpen={isEnabled}>
                  <div className={`rounded-lg border transition-all ${
                    isEnabled 
                      ? 'bg-primary/5 border-primary/30 shadow-sm' 
                      : 'bg-muted/30 border-muted'
                  }`}>
                    {/* Module header */}
                    <div className="flex items-center">
                      <div 
                        role="button"
                        tabIndex={isModuleDisabled ? -1 : 0}
                        onClick={handleModuleClick}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleModuleClick(e as any);
                          }
                        }}
                        className={`flex-1 p-3 flex items-center gap-3 ${
                          isModuleDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox
                          checked={isEnabled}
                          disabled={isModuleDisabled}
                          className="w-5 h-5 pointer-events-none"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium ${!canUserAccessModuleByRole ? 'text-muted-foreground/70' : ''}`}>
                            {moduleDef.label}
                          </span>
                          {moduleDef.description && (
                            <p className="text-xs text-muted-foreground truncate">{moduleDef.description}</p>
                          )}
                        </div>
                        {!canUserAccessModuleByRole && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            Override {VISIBLE_ROLE_LABELS[moduleDef.minRole]}+
                          </Badge>
                        )}
                      </div>
                      
                      {hasOptions && (
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-full px-3 rounded-none border-l border-border/30"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </div>

                    {/* Options */}
                    {hasOptions && (
                      <CollapsibleContent>
                        <div className="p-3 bg-background/50 border-t border-border/30">
                          <div className="grid grid-cols-2 gap-2">
                            {moduleDef.options!.map(option => {
                              const optionEnabled = moduleOptions[option.key] ?? option.defaultEnabled;
                              const isOptionAllowed = isRhModule 
                                ? isRhOptionAllowedForRole(effectiveRole, option.key)
                                : true;
                              const isOptionDisabled = !canEdit || !isOptionAllowed;
                              
                              const handleOptionClick = (e: React.MouseEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!isOptionDisabled) {
                                  if (!isEnabled) {
                                    onModuleToggle(moduleDef.key, true);
                                  }
                                  onModuleOptionToggle(moduleDef.key, option.key, !optionEnabled);
                                }
                              };
                              
                              return (
                                <div 
                                  key={option.key}
                                  role="button"
                                  tabIndex={isOptionDisabled ? -1 : 0}
                                  onClick={handleOptionClick}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      handleOptionClick(e as any);
                                    }
                                  }}
                                  className={`flex items-start gap-2 p-3 rounded-lg border-2 transition-all ${
                                    isOptionDisabled 
                                      ? 'opacity-50 cursor-not-allowed' 
                                      : 'cursor-pointer hover:shadow-md active:scale-[0.98]'
                                  } ${getOptionColors(option.key, optionEnabled, isEnabled)}`}
                                >
                                  <Checkbox
                                    checked={optionEnabled && isEnabled}
                                    disabled={isOptionDisabled}
                                    className="w-4 h-4 pointer-events-none shrink-0 mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium block">{option.label}</span>
                                    <span className="text-xs opacity-75 block mt-0.5 leading-tight">{option.description}</span>
                                  </div>
                                  {!isOptionAllowed && isRhModule && (
                                    <Badge variant="outline" className="text-[10px] shrink-0 h-5 px-1.5 mt-0.5">N2+</Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CollapsibleContent>
                    )}
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t gap-2 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          {canEdit && (
            <Button 
              onClick={handleSaveAndClose} 
              disabled={!isModified || isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Enregistrer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
