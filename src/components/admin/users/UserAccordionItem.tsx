import { memo, useMemo } from 'react';
import { GlobalRole, GLOBAL_ROLES, GLOBAL_ROLE_LABELS, GLOBAL_ROLE_COLORS, getAllRolesSorted } from '@/types/globalRoles';

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

// Vérifie si une option RH est autorisée pour ce rôle
function isRhOptionAllowedForRole(userRole: GlobalRole | null, optionKey: string): boolean {
  if (!userRole) return false;
  return RH_OPTIONS_BY_ROLE[userRole]?.includes(optionKey) ?? false;
}
import { MODULE_DEFINITIONS, EnabledModules, ModuleKey, ModuleOptionsState, canAccessModule } from '@/types/modules';
import { UserProfile } from '@/hooks/use-user-management';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Save, MoreHorizontal, Pencil, UserX, UserCheck, Trash2, AlertCircle, Eye, ChevronDown, Info, Shield, Zap } from 'lucide-react';

const ROLE_AGENCE_LABELS: Record<string, string> = {
  'dirigeant': 'Dirigeant(e)',
  'assistante': 'Assistante',
  'commercial': 'Commercial',
  'tete_de_reseau': 'Tête de réseau',
  'externe': 'Externe',
};

interface UserAccordionItemProps {
  user: UserProfile;
  effectiveRole: GlobalRole | null;
  effectiveModules: EnabledModules;
  isModified: boolean;
  canEdit: boolean;
  canDeactivate: boolean;
  canDelete: boolean;
  isSuperAdmin: boolean;
  assignableRoles: GlobalRole[];
  isSaving: boolean;
  onSaveChanges: () => void;
  onRoleChange: (role: GlobalRole) => void;
  onModuleToggle: (moduleKey: ModuleKey, enabled: boolean) => void;
  onModuleOptionToggle: (moduleKey: ModuleKey, optionKey: string, enabled: boolean) => void;
  onEditUser: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}

export const UserAccordionItem = memo(function UserAccordionItem({
  user,
  effectiveRole,
  effectiveModules,
  isModified,
  canEdit,
  canDeactivate,
  canDelete,
  isSuperAdmin,
  assignableRoles,
  isSaving,
  onSaveChanges,
  onRoleChange,
  onModuleToggle,
  onModuleOptionToggle,
  onEditUser,
  onDeactivate,
  onReactivate,
  onDelete,
}: UserAccordionItemProps) {
  const isDeactivated = user.is_active === false;

  const getInitials = () => {
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || '?';
  };

  const getDisplayName = () => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return 'Sans nom';
  };

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

  return (
    <AccordionItem value={user.id} className={`border-0 ${isDeactivated ? 'opacity-60 bg-muted/30' : ''}`}>
      <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 hover:no-underline">
        <div className="flex items-center gap-3 flex-1 text-left min-w-0">
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium shrink-0 ${isDeactivated ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
            {getInitials()}
          </div>
          
          {/* User Info - fixed width */}
          <div className="w-44 shrink-0 min-w-0">
            <div className="font-medium truncate">{getDisplayName()}</div>
            <div className="text-sm text-muted-foreground truncate">{user.email || 'Pas d\'email'}</div>
          </div>

          {/* Agency - fixed width */}
          <div className="hidden md:block w-24 shrink-0 text-sm text-muted-foreground truncate">
            {user.agence || 'Sans agence'}
          </div>

          {/* Poste - fixed width */}
          <div className="hidden lg:block w-24 shrink-0 text-sm text-muted-foreground truncate">
            {ROLE_AGENCE_LABELS[user.role_agence || ''] || user.role_agence || '-'}
          </div>

          {/* Global Role - fixed width */}
          <div className="w-44 shrink-0">
            {effectiveRole ? (
              <Badge className={`${GLOBAL_ROLE_COLORS[effectiveRole] || 'bg-muted'} text-xs`}>
                N{GLOBAL_ROLES[effectiveRole]} – {GLOBAL_ROLE_LABELS[effectiveRole]}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-xs">Non défini</Badge>
            )}
          </div>

          {/* Badges - fixed width container */}
          <div className="w-40 shrink-0 flex items-center gap-1 flex-wrap">
            {isModified && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs">
                Modifié
              </Badge>
            )}

            {isDeactivated && (
              <Badge variant="destructive" className="text-xs">
                <UserX className="w-3 h-3 mr-1" />
                Désactivé
              </Badge>
            )}

            {user.must_change_password && !isDeactivated && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30 text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    MDP provisoire
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  L'utilisateur n'a pas encore changé son mot de passe provisoire
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Actions - fixed width */}
          <div className="flex gap-2 shrink-0 w-32 justify-end" onClick={(e) => e.stopPropagation()}>
            {canEdit ? (
              <Button size="sm" variant="outline" onClick={onSaveChanges} disabled={!isModified || isSaving} className="h-8">
                <Save className="w-4 h-4 mr-1" />
                Sauver
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-muted-foreground text-xs">Lecture seule</Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Vous ne pouvez pas modifier cet utilisateur (niveau supérieur ou autre agence)
                </TooltipContent>
              </Tooltip>
            )}

            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background z-50">
                  <DropdownMenuItem onClick={onEditUser}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Modifier les informations
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {!isDeactivated ? (
                    <DropdownMenuItem onClick={onDeactivate} className="text-orange-600">
                      <UserX className="w-4 h-4 mr-2" />
                      Désactiver l'utilisateur
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={onReactivate} className="text-green-600">
                      <UserCheck className="w-4 h-4 mr-2" />
                      Réactiver l'utilisateur
                    </DropdownMenuItem>
                  )}
                  {canDelete && isSuperAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onDelete} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer définitivement
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent>
        <div className="px-4 pb-4 space-y-6 bg-muted/20">
          {/* Role Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <Shield className="w-4 h-4 text-primary" />
              Rôle global (plafond)
            </div>
            <Select
              value={effectiveRole || undefined}
              onValueChange={(v) => onRoleChange(v as GlobalRole)}
              disabled={!canEdit}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {getAllRolesSorted().filter(role => assignableRoles.includes(role)).map(role => (
                  <SelectItem key={role} value={role}>
                    N{GLOBAL_ROLES[role]} – {GLOBAL_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Modules Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-medium">
              <Zap className="w-4 h-4 text-primary" />
              Modules activés
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {MODULE_DEFINITIONS.map(moduleDef => {
                const isEnabled = isModuleEnabled(moduleDef.key);
                const options = getModuleOptions(moduleDef.key);
                const canUserAccessModule = canAccessModule(effectiveRole, moduleDef.key);
                const isModuleDisabled = !canEdit || !canUserAccessModule;

                return (
                  <div key={moduleDef.key} className={`p-3 rounded-lg border ${isEnabled ? 'bg-primary/5 border-primary/20' : canUserAccessModule ? 'bg-muted/30 border-muted' : 'bg-muted/50 border-destructive/30'}`}>
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
                            Ce module nécessite le rôle {GLOBAL_ROLE_LABELS[moduleDef.minRole]} (N{GLOBAL_ROLES[moduleDef.minRole]}) minimum
                          </TooltipContent>
                        )}
                      </Tooltip>
                      <span className={`text-sm font-medium ${!canUserAccessModule ? 'text-muted-foreground' : ''}`}>{moduleDef.label}</span>
                      {moduleDef.options.length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 px-2">
                              <Info className="w-3 h-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 bg-background z-50">
                            <p className="text-sm text-muted-foreground mb-2">{moduleDef.description || 'Options du module'}</p>
                            <div className="space-y-2">
                              {moduleDef.options.map(opt => {
                                // Pour le module RH, vérifier les contraintes de rôle
                                const isRhModule = moduleDef.key === 'rh';
                                const isOptionAllowedForRole = isRhModule 
                                  ? isRhOptionAllowedForRole(effectiveRole, opt.key)
                                  : true;
                                const isOptionDisabled = !isEnabled || !canEdit || !isOptionAllowedForRole;
                                const isOptionChecked = isOptionAllowedForRole && (options[opt.key] ?? opt.defaultEnabled);
                                
                                return (
                                  <div 
                                    key={opt.key} 
                                    className={`flex items-center gap-2 ${!isOptionAllowedForRole ? 'opacity-50' : ''}`}
                                  >
                                    <Checkbox
                                      checked={isOptionChecked}
                                      onCheckedChange={(checked) => onModuleOptionToggle(moduleDef.key, opt.key, !!checked)}
                                      disabled={isOptionDisabled}
                                    />
                                    <span className="text-sm">{opt.label}</span>
                                    {isRhModule && !isOptionAllowedForRole && (
                                      <span className="text-xs text-destructive">(N2+ requis)</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Additional Info */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 font-medium text-muted-foreground hover:text-foreground">
              <Eye className="w-4 h-4" />
              Informations complémentaires
              <ChevronDown className="w-4 h-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Créé le:</span>
                  <p>{new Date(user.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Poste occupé:</span>
                  <p>{ROLE_AGENCE_LABELS[user.role_agence || ''] || user.role_agence || '-'}</p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
});
