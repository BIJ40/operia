import { memo } from 'react';
import { GlobalRole, GLOBAL_ROLES, getAllRolesSorted } from '@/types/globalRoles';
import { VISIBLE_ROLE_LABELS, VISIBLE_ROLE_COLORS } from '@/lib/visibleRoleLabels';
import { MODULE_DEFINITIONS, EnabledModules, ModuleKey, canAccessModule } from '@/types/modules';
import { UserProfile } from '@/hooks/use-user-management';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Save, MoreHorizontal, Pencil, UserX, UserCheck, Trash2, AlertCircle, Eye, ChevronDown, Shield, Zap } from 'lucide-react';

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
  /** Map slug → label pour l'affichage des agences */
  agencyLabelsMap?: Map<string, string>;
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
  agencyLabelsMap,
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
            {user.agencyLabel || agencyLabelsMap?.get(user.agence || '') || user.agence || 'Sans agence'}
          </div>

          {/* Poste - fixed width */}
          <div className="hidden lg:block w-24 shrink-0 text-sm text-muted-foreground truncate">
            {ROLE_AGENCE_LABELS[user.role_agence || ''] || user.role_agence || '-'}
          </div>

          {/* Global Role - fixed width */}
          <div className="w-44 shrink-0">
            {effectiveRole ? (
              <Badge className={`${VISIBLE_ROLE_COLORS[effectiveRole] || 'bg-muted'} text-xs`}>
                {VISIBLE_ROLE_LABELS[effectiveRole]}
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
                    {VISIBLE_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Modules Section - Interface unifiée */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <Zap className="w-4 h-4 text-primary" />
                Permissions & Accès
              </div>
              <span className="text-xs text-muted-foreground">
                Cliquez sur un module pour l'activer/désactiver
              </span>
            </div>

            {/* Tous les modules avec le même style */}
            <div className="space-y-3">
              {MODULE_DEFINITIONS.map(moduleDef => {
                const isEnabled = isModuleEnabled(moduleDef.key);
                const canUserAccessModule = canAccessModule(effectiveRole, moduleDef.key);
                const isModuleDisabled = !canEdit || !canUserAccessModule;
                const moduleOptions = getModuleOptions(moduleDef.key);
                const hasOptions = moduleDef.options && moduleDef.options.length > 0;

                // Pour RH, on vérifie aussi les contraintes de rôle par option
                const isRhModule = moduleDef.key === 'rh';

                const handleModuleClick = (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isModuleDisabled) {
                    onModuleToggle(moduleDef.key, !isEnabled);
                  }
                };

                return (
                  <Collapsible 
                    key={moduleDef.key}
                    defaultOpen={isEnabled}
                  >
                    <div 
                      className={`rounded-lg border transition-all ${
                        isEnabled 
                          ? 'bg-primary/5 border-primary/30 shadow-sm' 
                          : 'bg-muted/30 border-muted'
                      }`}
                    >
                      {/* Module header */}
                      <div className="flex items-center">
                        {/* Zone cliquable pour activer/désactiver */}
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
                            <span className={`text-sm font-medium ${!canUserAccessModule ? 'text-muted-foreground' : ''}`}>
                              {moduleDef.label}
                            </span>
                            {moduleDef.description && (
                              <p className="text-xs text-muted-foreground truncate">{moduleDef.description}</p>
                            )}
                          </div>
                          {!canUserAccessModule && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {VISIBLE_ROLE_LABELS[moduleDef.minRole]}+
                            </Badge>
                          )}
                        </div>
                        
                        {/* Bouton pour replier/déplier les options */}
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

                      {/* Options du module - 2 colonnes avec couleurs par niveau */}
                      {hasOptions && (
                        <CollapsibleContent>
                          <div className="p-3 bg-background/50 border-t border-border/30">
                            <div className="grid grid-cols-2 gap-2">
                              {moduleDef.options!.map(option => {
                                const optionEnabled = moduleOptions[option.key] ?? option.defaultEnabled;
                                
                                // Pour RH, vérifier si l'option est autorisée pour ce rôle
                                const isOptionAllowed = isRhModule 
                                  ? isRhOptionAllowedForRole(effectiveRole, option.key)
                                  : true;
                                const isOptionDisabled = !canEdit || !isOptionAllowed;
                                
                                // Couleurs par niveau d'accès
                                // 🟢 Vert = accès basique (consultation personnelle)
                                // 🔵 Bleu = accès intermédiaire (gestion équipe)
                                // 🟣 Violet = accès admin (administration complète)
                                const getOptionColors = () => {
                                  const baseOptions = ['coffre', 'user', 'kanban', 'apogee', 'apporteurs', 'helpconfort', 'base_documentaire', 'dm', 'docs', 'stats'];
                                  const intermediateOptions = ['rh_viewer', 'manage', 'agent', 'indicateurs', 'actions_a_mener', 'diffusion', 'dashboard', 'agences', 'comparatifs', 'groups', 'exports', 'vehicules', 'epi', 'equipements'];
                                  const adminOptions = ['rh_admin', 'import', 'admin', 'redevances', 'edition', 'users', 'agencies', 'permissions', 'backup', 'logs', 'faq_admin'];
                                  
                                  if (!optionEnabled || !isEnabled) {
                                    return 'bg-muted/50 border-muted/50 text-muted-foreground';
                                  }
                                  if (adminOptions.includes(option.key)) {
                                    return 'bg-violet-50 border-violet-400 text-violet-900 dark:bg-violet-950/40 dark:border-violet-600 dark:text-violet-100';
                                  }
                                  if (intermediateOptions.includes(option.key)) {
                                    return 'bg-blue-50 border-blue-400 text-blue-900 dark:bg-blue-950/40 dark:border-blue-600 dark:text-blue-100';
                                  }
                                  if (baseOptions.includes(option.key)) {
                                    return 'bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-600 dark:text-emerald-100';
                                  }
                                  return 'bg-primary/10 border-primary/40';
                                };
                                
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
                                    } ${getOptionColors()}`}
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
