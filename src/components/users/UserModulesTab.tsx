import { memo, useState, useMemo } from 'react';
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { VISIBLE_ROLE_LABELS } from '@/lib/visibleRoleLabels';
import { 
  MODULE_DEFINITIONS, DEPLOYED_MODULES, EnabledModules, ModuleKey, 
  ModuleDefinition, ModuleCategory, canAccessModule 
} from '@/types/modules';
import { SHARED_MODULE_OPTION_MIN_ROLES as MODULE_OPTION_MIN_ROLES } from '@/permissions/shared-constants';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, Eye, ShieldCheck, Briefcase, Truck, 
  HelpCircle, CheckCircle2, ChevronDown, ChevronRight,
  FileText, Users, CreditCard, Car, Wrench, AlertTriangle,
  BookOpen, BarChart3, Headphones, Settings, MessageSquare, Kanban,
  Network, Building2, Coins, Calendar, MapPin, Search, Target,
  FolderOpen, Video, Handshake, Brain, HelpCircle as HelpCircleIcon
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface UserModulesTabProps {
  enabledModules: EnabledModules | null;
  userRole: GlobalRole | null;
  canEdit: boolean;
  onModuleToggle: (moduleKey: ModuleKey, enabled: boolean) => void;
  onModuleOptionToggle: (moduleKey: ModuleKey, optionKey: string, enabled: boolean) => void;
}

// ============================================================================
// ICON REGISTRY - Mapping icon string → React component
// ============================================================================

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2, BarChart3, Users, Truck, Handshake, Calendar, Video,
  FolderOpen, BookOpen, Kanban, HelpCircle, Target, Brain,
  Network, Settings, Eye, ShieldCheck, Car, Wrench, MapPin,
  Briefcase, Headphones, Search, MessageSquare, Coins,
};

function getIconComponent(iconName: string): React.ReactNode {
  const Icon = ICON_MAP[iconName];
  if (!Icon) return null;
  return <Icon className="w-5 h-5" />;
}

// ============================================================================
// CATEGORY CONFIGURATION - Derived from ModuleCategory type
// ============================================================================

const CATEGORY_CONFIG: Record<ModuleCategory, { 
  label: string; 
  icon: React.ReactNode; 
  description: string;
  color: string;
  order: number;
}> = {
  pilotage: { 
    label: 'Pilotage', 
    icon: <BarChart3 className="w-5 h-5 text-warm-pink" />,
    description: 'Statistiques, performance, actions à mener',
    color: 'text-warm-pink',
    order: 1,
  },
  commercial: { 
    label: 'Commercial', 
    icon: <Target className="w-5 h-5 text-warm-orange" />,
    description: 'Prospection, devis acceptés, incohérences',
    color: 'text-warm-orange',
    order: 2,
  },
  organisation: { 
    label: 'Organisation', 
    icon: <Users className="w-5 h-5 text-warm-green" />,
    description: 'Collaborateurs, apporteurs, plannings, réunions, parc, conformité',
    color: 'text-warm-green',
    order: 3,
  },
  relations: { 
    label: 'Relations', 
    icon: <Users className="w-5 h-5 text-purple-500" />,
    description: 'Gestion des apporteurs',
    color: 'text-purple-500',
    order: 3.5,
  },
  documents: { 
    label: 'Documents', 
    icon: <FolderOpen className="w-5 h-5 text-cyan-500" />,
    description: 'Médiathèque centralisée',
    color: 'text-cyan-500',
    order: 4,
  },
  support: { 
    label: 'Support', 
    icon: <Headphones className="w-5 h-5 text-violet-500" />,
    description: 'Aide en ligne, guides, FAQ, ticketing',
    color: 'text-violet-500',
    order: 5,
  },
  reseau: { 
    label: 'Réseau Franchiseur', 
    icon: <Network className="w-5 h-5 text-purple-500" />,
    description: 'Pilotage multi-agences et redevances',
    color: 'text-purple-500',
    order: 7,
  },
  admin: { 
    label: 'Administration', 
    icon: <Settings className="w-5 h-5 text-slate-500" />,
    description: 'Configuration système',
    color: 'text-slate-500',
    order: 8,
  },
};

// Internal module keys to exclude from the new UI
const EXCLUDED_MODULE_KEYS: ModuleKey[] = ['unified_search'];

// ============================================================================
// COMPONENT
// ============================================================================

export const UserModulesTab = memo(function UserModulesTab({
  enabledModules,
  userRole,
  canEdit,
  onModuleToggle,
  onModuleOptionToggle,
}: UserModulesTabProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['agence', 'rh', 'parc']);

  // Get deployed, non-legacy modules grouped by category
  const modulesByCategory = useMemo(() => {
    const modules = DEPLOYED_MODULES.filter(m => !EXCLUDED_MODULE_KEYS.includes(m.key));
    
    const grouped: Record<string, ModuleDefinition[]> = {};
    for (const mod of modules) {
      if (!grouped[mod.category]) grouped[mod.category] = [];
      grouped[mod.category].push(mod);
    }
    return grouped;
  }, []);

  // Sorted categories
  const sortedCategories = useMemo(() => {
    return Object.keys(modulesByCategory).sort(
      (a, b) => (CATEGORY_CONFIG[a as ModuleCategory]?.order ?? 99) - (CATEGORY_CONFIG[b as ModuleCategory]?.order ?? 99)
    );
  }, [modulesByCategory]);

  const isModuleEnabled = (moduleKey: ModuleKey): boolean => {
    if (!enabledModules) return false;
    const state = enabledModules[moduleKey];
    if (typeof state === 'boolean') return state;
    if (typeof state === 'object') return state.enabled;
    return false;
  };

  const isOptionEnabled = (moduleKey: ModuleKey, optionKey: string): boolean => {
    if (!enabledModules) return false;
    const state = enabledModules[moduleKey];
    if (typeof state === 'object' && state.options) {
      return state.options[optionKey] ?? false;
    }
    return false;
  };

  const canAccessModuleForRole = (moduleDef: ModuleDefinition): boolean => {
    if (!userRole) return false;
    return GLOBAL_ROLES[userRole] >= GLOBAL_ROLES[moduleDef.minRole];
  };

  const canAccessOptionForRole = (moduleDef: ModuleDefinition, optionKey: string): boolean => {
    if (!userRole) return false;
    const optionPath = `${moduleDef.key}.${optionKey}`;
    const minRole = MODULE_OPTION_MIN_ROLES[optionPath] || moduleDef.minRole;
    return GLOBAL_ROLES[userRole] >= GLOBAL_ROLES[minRole];
  };

  const handleModuleToggle = (moduleDef: ModuleDefinition) => {
    if (!canEdit || !canAccessModuleForRole(moduleDef)) return;
    const newEnabled = !isModuleEnabled(moduleDef.key);
    onModuleToggle(moduleDef.key, newEnabled);
    
    // Si on active le module, activer les options par défaut
    if (newEnabled && moduleDef.options.length > 0) {
      for (const opt of moduleDef.options) {
        if (opt.defaultEnabled) {
          onModuleOptionToggle(moduleDef.key, opt.key, true);
        }
      }
    }
  };

  const handleOptionToggle = (moduleDef: ModuleDefinition, optionKey: string) => {
    if (!canEdit || !canAccessOptionForRole(moduleDef, optionKey)) return;
    
    // Activer le module parent si nécessaire
    if (!isModuleEnabled(moduleDef.key)) {
      onModuleToggle(moduleDef.key, true);
    }
    
    onModuleOptionToggle(moduleDef.key, optionKey, !isOptionEnabled(moduleDef.key, optionKey));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Count active modules
  const activeModuleCount = useMemo(() => {
    let count = 0;
    for (const cat of Object.values(modulesByCategory)) {
      for (const mod of cat) {
        if (isModuleEnabled(mod.key)) count++;
      }
    }
    return count;
  }, [modulesByCategory, enabledModules]);

  return (
    <div className="space-y-4">
      {/* Résumé */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Activez les modules et options pour cet utilisateur. L'arbre reflète les onglets de la plateforme.
          </span>
        </div>
        <Badge variant="secondary">
          {activeModuleCount} module{activeModuleCount > 1 ? 's' : ''} actif{activeModuleCount > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Modules par catégorie */}
      {sortedCategories.map(category => {
        const modules = modulesByCategory[category];
        if (!modules || modules.length === 0) return null;
        
        const catConfig = CATEGORY_CONFIG[category as ModuleCategory];
        const isExpanded = expandedCategories.includes(category);
        const activeInCategory = modules.filter(m => isModuleEnabled(m.key)).length;

        return (
          <Card key={category} className="overflow-hidden">
            <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      {catConfig?.icon}
                      <div>
                        <CardTitle className="text-base">{catConfig?.label}</CardTitle>
                        <CardDescription className="text-xs">{catConfig?.description}</CardDescription>
                      </div>
                    </div>
                    {activeInCategory > 0 && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        {activeInCategory}/{modules.length} actif{activeInCategory > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0 pb-4">
                  <div className="space-y-2">
                    {modules.map(moduleDef => {
                      const moduleEnabled = isModuleEnabled(moduleDef.key);
                      const moduleAllowed = canAccessModuleForRole(moduleDef);
                      const moduleDisabled = !canEdit || !moduleAllowed;

                      return (
                        <div key={moduleDef.key} className="rounded-lg border">
                          {/* Module header row */}
                          <div
                            className={`flex items-center gap-3 p-3 transition-all ${
                              moduleDisabled ? 'opacity-50 cursor-not-allowed bg-muted/30' : 'cursor-pointer hover:bg-muted/30'
                            } ${moduleEnabled ? 'bg-primary/5' : ''}`}
                            onClick={() => handleModuleToggle(moduleDef)}
                          >
                            <Checkbox
                              checked={moduleEnabled && moduleAllowed}
                              disabled={moduleDisabled}
                              onCheckedChange={() => handleModuleToggle(moduleDef)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5"
                            />
                            <span className={catConfig?.color}>{getIconComponent(moduleDef.icon)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{moduleDef.label}</span>
                                <span className="text-xs text-muted-foreground">{moduleDef.description}</span>
                              </div>
                            </div>
                            {moduleEnabled && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                            {!moduleAllowed && (
                              <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                            )}
                          </div>

                          {/* Options (sous-modules) - en escalier */}
                          {moduleDef.options.length > 0 && moduleEnabled && (
                            <div className="border-t bg-muted/10">
                              {moduleDef.options.map(option => {
                                const optEnabled = isOptionEnabled(moduleDef.key, option.key);
                                const optAllowed = canAccessOptionForRole(moduleDef, option.key);
                                const optDisabled = !canEdit || !optAllowed;

                                return (
                                  <div
                                    key={option.key}
                                    className={`flex items-center gap-3 pl-10 pr-3 py-2 border-t first:border-t-0 transition-all ${
                                      optDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/20'
                                    }`}
                                    onClick={() => handleOptionToggle(moduleDef, option.key)}
                                  >
                                    <span className="text-muted-foreground text-xs">└</span>
                                    <Checkbox
                                      checked={optEnabled && optAllowed}
                                      disabled={optDisabled}
                                      onCheckedChange={() => handleOptionToggle(moduleDef, option.key)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-4 h-4"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm font-medium">{option.label}</span>
                                      <span className="text-xs text-muted-foreground ml-2">{option.description}</span>
                                    </div>
                                    {optEnabled && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                                    {!optAllowed && (
                                      <div className="flex items-center gap-1 text-xs text-amber-600">
                                        <Lock className="w-3 h-3" />
                                        <span>{VISIBLE_ROLE_LABELS[MODULE_OPTION_MIN_ROLES[`${moduleDef.key}.${option.key}`] as GlobalRole] || 'Rôle supérieur'}</span>
                                      </div>
                                    )}
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
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
});
