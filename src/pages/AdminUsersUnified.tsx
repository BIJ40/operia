import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  GLOBAL_ROLES, 
  GLOBAL_ROLE_LABELS, 
  GLOBAL_ROLE_COLORS,
  GlobalRole,
  getAllRolesSorted 
} from '@/types/globalRoles';
import { 
  MODULE_DEFINITIONS, 
  EnabledModules,
  ModuleOptionsState,
  ModuleKey 
} from '@/types/modules';
import { 
  getGlobalRoleFromLegacy, 
  getEnabledModulesFromLegacy 
} from '@/types/accessControl';
import { logAuth } from '@/lib/logger';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  Search, 
  Save, 
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  MinusCircle,
  AlertCircle,
  Loader2,
  Info,
  ChevronDown,
  Building2,
  Briefcase,
  Shield,
  UserCog,
  Zap,
  Eye
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  agence: string | null;
  global_role: GlobalRole | null;
  enabled_modules: EnabledModules | null;
  // Legacy fields
  system_role: string | null;
  role_agence: string | null;
  service_competencies: any;
  support_level: number | null;
  created_at: string;
}

interface UserCapability {
  user_id: string;
  capability: string;
  is_active: boolean;
}

interface UserAppRole {
  user_id: string;
  role: string;
}

interface FranchiseurRole {
  user_id: string;
  franchiseur_role: string;
}

const PAGE_SIZE = 20;

const ROLE_AGENCE_LABELS: Record<string, string> = {
  'dirigeant': 'Dirigeant(e)',
  'assistante': 'Assistante',
  'commercial': 'Commercial',
  'tete_de_reseau': 'Tête de réseau',
  'externe': 'Externe',
};

export default function AdminUsersUnified() {
  const queryClient = useQueryClient();
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [agencyFilter, setAgencyFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  
  // Track modified rows
  const [modifiedUsers, setModifiedUsers] = useState<Record<string, {
    global_role?: GlobalRole | null;
    enabled_modules?: EnabledModules | null;
  }>>({});

  // Accordion state
  const [openItems, setOpenItems] = useState<string[]>([]);

  // Fetch users with profiles
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-unified'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, agence, global_role, enabled_modules, system_role, role_agence, service_competencies, support_level, created_at')
        .order('email');
      
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  // Fetch user capabilities
  const { data: capabilities } = useQuery({
    queryKey: ['admin-users-unified-capabilities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_capabilities')
        .select('user_id, capability, is_active')
        .eq('is_active', true);
      
      if (error) throw error;
      return data as UserCapability[];
    },
  });

  // Fetch user roles
  const { data: userRoles } = useQuery({
    queryKey: ['admin-users-unified-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (error) throw error;
      return data as UserAppRole[];
    },
  });

  // Fetch franchiseur roles
  const { data: franchiseurRoles } = useQuery({
    queryKey: ['admin-users-unified-franchiseur-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franchiseur_roles')
        .select('user_id, franchiseur_role');
      
      if (error) throw error;
      return data as FranchiseurRole[];
    },
  });

  // Calculate suggestions for each user
  const usersWithSuggestions = useMemo(() => {
    if (!users) return [];
    
    return users.map(user => {
      const userCaps = capabilities?.filter(c => c.user_id === user.id) || [];
      const userAppRoles = userRoles?.filter(r => r.user_id === user.id) || [];
      const userFranchiseurRole = franchiseurRoles?.find(r => r.user_id === user.id);
      
      const isAdmin = userAppRoles.some(r => r.role === 'admin');
      const isFranchiseur = userAppRoles.some(r => r.role === 'franchiseur');
      const isSupport = userCaps.some(c => c.capability === 'support' && c.is_active);
      
      const suggestedGlobalRole = getGlobalRoleFromLegacy({
        hasAdminRole: isAdmin,
        hasFranchiseurRole: isFranchiseur,
        franchiseurRole: userFranchiseurRole?.franchiseur_role as string | null,
        systemRole: user.system_role,
        roleAgence: user.role_agence,
        hasSupportRole: isSupport,
      });
      
      const suggestedEnabledModules = getEnabledModulesFromLegacy({
        globalRole: suggestedGlobalRole,
        hasAdminRole: isAdmin,
        hasFranchiseurRole: isFranchiseur,
        hasSupportRole: isSupport,
      });
      
      return {
        ...user,
        suggestedGlobalRole,
        suggestedEnabledModules,
        legacyRoles: userAppRoles.map(r => r.role),
        legacyCapabilities: userCaps.map(c => c.capability),
        franchiseurRole: userFranchiseurRole?.franchiseur_role,
      };
    });
  }, [users, capabilities, userRoles, franchiseurRoles]);

  // Get unique agencies
  const agencies = useMemo(() => {
    if (!users) return [];
    const agencySet = new Set(users.map(u => u.agence).filter(Boolean) as string[]);
    return Array.from(agencySet).sort();
  }, [users]);

  // Check if module is enabled
  const isModuleEnabledForUser = (modules: EnabledModules, moduleKey: ModuleKey): boolean => {
    const state = modules[moduleKey];
    if (typeof state === 'boolean') return state;
    if (typeof state === 'object') return state.enabled;
    return false;
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    return usersWithSuggestions.filter(user => {
      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        const agence = (user.agence || '').toLowerCase();
        if (!fullName.includes(search) && !email.includes(search) && !agence.includes(search)) {
          return false;
        }
      }
      
      // Agency filter
      if (agencyFilter !== 'all') {
        if (agencyFilter === 'none' && user.agence) return false;
        if (agencyFilter !== 'none' && user.agence !== agencyFilter) return false;
      }
      
      // Role filter
      if (roleFilter !== 'all') {
        const effectiveRole = modifiedUsers[user.id]?.global_role ?? user.global_role;
        if (effectiveRole !== roleFilter) return false;
      }

      // Module filter
      if (moduleFilter !== 'all') {
        const effectiveModules = modifiedUsers[user.id]?.enabled_modules ?? user.enabled_modules ?? {};
        if (!isModuleEnabledForUser(effectiveModules, moduleFilter as ModuleKey)) return false;
      }
      
      return true;
    });
  }, [usersWithSuggestions, searchQuery, agencyFilter, roleFilter, moduleFilter, modifiedUsers]);

  // Paginated users
  const paginatedUsers = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ userId, globalRole, enabledModules }: { 
      userId: string; 
      globalRole: GlobalRole | null; 
      enabledModules: EnabledModules | null;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          global_role: globalRole,
          enabled_modules: enabledModules as Json
        })
        .eq('id', userId);
      
      if (error) throw error;
      return { userId, globalRole, enabledModules };
    },
    onSuccess: ({ userId }) => {
      logAuth.info(`[V2] Permissions sauvegardées pour user ${userId}`);
      toast.success('Permissions V2 enregistrées');
      
      setModifiedUsers(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      
      queryClient.invalidateQueries({ queryKey: ['admin-users-unified'] });
    },
    onError: (error) => {
      logAuth.error('[V2] Erreur sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    },
  });

  // Apply V2 suggestion
  const applyV2 = (user: typeof usersWithSuggestions[0]) => {
    if (!user.suggestedGlobalRole) return;
    
    saveMutation.mutate({
      userId: user.id,
      globalRole: user.suggestedGlobalRole,
      enabledModules: user.suggestedEnabledModules,
    });
  };

  // Save manual changes
  const saveChanges = (userId: string) => {
    const user = usersWithSuggestions.find(u => u.id === userId);
    const changes = modifiedUsers[userId];
    if (!user || !changes) return;
    
    saveMutation.mutate({
      userId,
      globalRole: changes.global_role ?? user.global_role,
      enabledModules: changes.enabled_modules ?? user.enabled_modules,
    });
  };

  // Handle role change
  const handleRoleChange = (userId: string, role: GlobalRole) => {
    setModifiedUsers(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        global_role: role,
      },
    }));
  };

  // Handle module toggle
  const handleModuleToggle = (userId: string, moduleKey: ModuleKey, enabled: boolean) => {
    const user = usersWithSuggestions.find(u => u.id === userId);
    if (!user) return;
    
    const currentModules = modifiedUsers[userId]?.enabled_modules ?? user.enabled_modules ?? {};
    const moduleState = currentModules[moduleKey];
    
    let newModuleState: ModuleOptionsState;
    if (typeof moduleState === 'object') {
      newModuleState = { ...moduleState, enabled };
    } else {
      const moduleDef = MODULE_DEFINITIONS.find(m => m.key === moduleKey);
      const defaultOptions: Record<string, boolean> = {};
      moduleDef?.options.forEach(opt => {
        defaultOptions[opt.key] = opt.defaultEnabled;
      });
      newModuleState = { enabled, options: defaultOptions };
    }
    
    setModifiedUsers(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        enabled_modules: {
          ...currentModules,
          [moduleKey]: newModuleState,
        },
      },
    }));
  };

  // Handle module option toggle
  const handleOptionToggle = (userId: string, moduleKey: ModuleKey, optionKey: string, enabled: boolean) => {
    const user = usersWithSuggestions.find(u => u.id === userId);
    if (!user) return;
    
    const currentModules = modifiedUsers[userId]?.enabled_modules ?? user.enabled_modules ?? {};
    const moduleState = currentModules[moduleKey];
    
    let currentOptions: Record<string, boolean> = {};
    if (typeof moduleState === 'object' && moduleState.options) {
      currentOptions = { ...moduleState.options };
    }
    
    currentOptions[optionKey] = enabled;
    
    const newModuleState: ModuleOptionsState = {
      enabled: typeof moduleState === 'object' ? moduleState.enabled : !!moduleState,
      options: currentOptions,
    };
    
    setModifiedUsers(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        enabled_modules: {
          ...currentModules,
          [moduleKey]: newModuleState,
        },
      },
    }));
  };

  // Get effective values
  const getEffectiveRole = (user: typeof usersWithSuggestions[0]) => {
    return modifiedUsers[user.id]?.global_role ?? user.global_role;
  };

  const getEffectiveModules = (user: typeof usersWithSuggestions[0]): EnabledModules => {
    return modifiedUsers[user.id]?.enabled_modules ?? user.enabled_modules ?? {};
  };

  // Get module options
  const getModuleOptions = (modules: EnabledModules, moduleKey: ModuleKey): Record<string, boolean> => {
    const state = modules[moduleKey];
    if (typeof state === 'object' && state.options) return state.options;
    return {};
  };

  // Status indicator
  const getStatusIndicator = (user: typeof usersWithSuggestions[0]) => {
    const effectiveRole = getEffectiveRole(user);
    const effectiveModules = getEffectiveModules(user);
    
    const roleMatch = effectiveRole === user.suggestedGlobalRole;
    const modulesMatch = JSON.stringify(effectiveModules) === JSON.stringify(user.suggestedEnabledModules);
    
    if (!effectiveRole && !user.suggestedGlobalRole) {
      return { status: 'empty', label: 'Non configuré', color: 'bg-muted text-muted-foreground', icon: MinusCircle };
    }
    if (!effectiveRole) {
      return { status: 'pending', label: 'À appliquer', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle };
    }
    if (roleMatch && modulesMatch) {
      return { status: 'ok', label: 'V2 OK', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 };
    }
    return { status: 'different', label: 'Différent', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle };
  };

  // User initials
  const getInitials = (user: UserProfile) => {
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || '?';
  };

  // User display name
  const getDisplayName = (user: UserProfile) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return 'Sans nom';
  };

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Utilisateurs & Permissions V2</h1>
            <p className="text-muted-foreground">
              Gestion des rôles globaux et modules activés par utilisateur
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5">
            <Info className="w-3 h-3 mr-1" />
            V2 en préparation
          </Badge>
        </div>

        {/* Filters Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, email ou agence..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(0);
                  }}
                  className="pl-10"
                />
              </div>
              
              <Select value={agencyFilter} onValueChange={(v) => { setAgencyFilter(v); setCurrentPage(0); }}>
                <SelectTrigger className="w-[180px]">
                  <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Toutes agences" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes agences</SelectItem>
                  <SelectItem value="none">Sans agence</SelectItem>
                  {agencies.map(agency => (
                    <SelectItem key={agency} value={agency}>{agency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(0); }}>
                <SelectTrigger className="w-[220px]">
                  <Shield className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Tous rôles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous rôles globaux</SelectItem>
                  {getAllRolesSorted().map(role => (
                    <SelectItem key={role} value={role}>
                      N{GLOBAL_ROLES[role]} – {GLOBAL_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setCurrentPage(0); }}>
                <SelectTrigger className="w-[200px]">
                  <Zap className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Tous modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous modules</SelectItem>
                  {MODULE_DEFINITIONS.map(mod => (
                    <SelectItem key={mod.key} value={mod.key}>{mod.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardContent className="p-0">
            <Accordion 
              type="multiple" 
              value={openItems} 
              onValueChange={setOpenItems}
              className="divide-y"
            >
              {paginatedUsers.map((user) => {
                const effectiveRole = getEffectiveRole(user);
                const effectiveModules = getEffectiveModules(user);
                const isModified = !!modifiedUsers[user.id];
                const status = getStatusIndicator(user);
                const StatusIcon = status.icon;

                return (
                  <AccordionItem key={user.id} value={user.id} className="border-0">
                    <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 hover:no-underline">
                      <div className="flex items-center gap-4 flex-1 text-left">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary shrink-0">
                          {getInitials(user)}
                        </div>
                        
                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{getDisplayName(user)}</div>
                          <div className="text-sm text-muted-foreground truncate">{user.email || 'Pas d\'email'}</div>
                        </div>

                        {/* Agency */}
                        <div className="hidden md:block w-32 text-sm text-muted-foreground truncate">
                          {user.agence || 'Sans agence'}
                        </div>

                        {/* Poste (legacy info) */}
                        <div className="hidden lg:block w-28 text-sm text-muted-foreground">
                          {ROLE_AGENCE_LABELS[user.role_agence || ''] || user.role_agence || '-'}
                        </div>

                        {/* Global Role */}
                        <div className="w-40">
                          {effectiveRole ? (
                            <Badge className={GLOBAL_ROLE_COLORS[effectiveRole] || 'bg-muted'}>
                              N{GLOBAL_ROLES[effectiveRole]} – {GLOBAL_ROLE_LABELS[effectiveRole]}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Non défini</Badge>
                          )}
                        </div>

                        {/* Status */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className={`${status.color} shrink-0`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Comparaison avec les valeurs suggérées V2
                          </TooltipContent>
                        </Tooltip>

                        {/* Modified indicator */}
                        {isModified && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            Modifié
                          </Badge>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => saveChanges(user.id)}
                            disabled={!isModified || saveMutation.isPending}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Sauver
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => applyV2(user)}
                                disabled={isModified || !user.suggestedGlobalRole || status.status === 'ok' || saveMutation.isPending}
                              >
                                V2
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Appliquer les valeurs V2 suggérées
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                        {/* V2 Configuration */}
                        <div className="space-y-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Configuration V2
                          </h4>
                          
                          {/* Global Role Selector */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Rôle global</label>
                            <Select
                              value={effectiveRole || ''}
                              onValueChange={(v) => handleRoleChange(user.id, v as GlobalRole)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un rôle" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAllRolesSorted().map(role => (
                                  <SelectItem key={role} value={role}>
                                    N{GLOBAL_ROLES[role]} – {GLOBAL_ROLE_LABELS[role]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {user.suggestedGlobalRole && (
                              <p className="text-xs text-muted-foreground">
                                Suggéré: N{GLOBAL_ROLES[user.suggestedGlobalRole]} – {GLOBAL_ROLE_LABELS[user.suggestedGlobalRole]}
                              </p>
                            )}
                          </div>

                          {/* Modules */}
                          <div className="space-y-3">
                            <label className="text-sm font-medium">Modules activés</label>
                            <div className="space-y-2">
                              {MODULE_DEFINITIONS.map(moduleDef => {
                                const isEnabled = isModuleEnabledForUser(effectiveModules, moduleDef.key);
                                const options = getModuleOptions(effectiveModules, moduleDef.key);
                                
                                return (
                                  <div key={moduleDef.key} className="border rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Switch
                                          checked={isEnabled}
                                          onCheckedChange={(checked) => handleModuleToggle(user.id, moduleDef.key, checked)}
                                        />
                                        <span className="text-sm font-medium">{moduleDef.label}</span>
                                        {moduleDef.options.length > 0 && (
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-6 px-2">
                                                <Info className="w-3 h-3" />
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-64">
                                              <p className="text-sm text-muted-foreground mb-2">{moduleDef.description || 'Options du module'}</p>
                                              <div className="space-y-2">
                                                {moduleDef.options.map(opt => (
                                                  <div key={opt.key} className="flex items-center gap-2">
                                                    <Checkbox
                                                      checked={options[opt.key] ?? opt.defaultEnabled}
                                                      onCheckedChange={(checked) => handleOptionToggle(user.id, moduleDef.key, opt.key, !!checked)}
                                                      disabled={!isEnabled}
                                                    />
                                                    <span className="text-sm">{opt.label}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </PopoverContent>
                                          </Popover>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Legacy Info (read-only) */}
                        <div className="space-y-4">
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center gap-2 font-medium text-muted-foreground hover:text-foreground">
                              <Eye className="w-4 h-4" />
                              Informations legacy (lecture seule)
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
                                <div>
                                  <span className="text-muted-foreground">System role (legacy):</span>
                                  <p>{user.system_role || '-'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Support level:</span>
                                  <p>{user.support_level ?? '-'}</p>
                                </div>
                              </div>
                              
                              <div>
                                <span className="text-muted-foreground text-sm">Rôles app (user_roles):</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {user.legacyRoles.length > 0 ? (
                                    user.legacyRoles.map(role => (
                                      <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Aucun</span>
                                  )}
                                </div>
                              </div>

                              <div>
                                <span className="text-muted-foreground text-sm">Capabilities:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {user.legacyCapabilities.length > 0 ? (
                                    user.legacyCapabilities.map(cap => (
                                      <Badge key={cap} variant="outline" className="text-xs">{cap}</Badge>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Aucune</span>
                                  )}
                                </div>
                              </div>

                              {user.franchiseurRole && (
                                <div>
                                  <span className="text-muted-foreground text-sm">Rôle franchiseur:</span>
                                  <Badge variant="secondary" className="ml-2 text-xs">{user.franchiseurRole}</Badge>
                                </div>
                              )}

                              {user.service_competencies && Object.keys(user.service_competencies).length > 0 && (
                                <div>
                                  <span className="text-muted-foreground text-sm">Compétences service:</span>
                                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                                    {JSON.stringify(user.service_competencies, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            {paginatedUsers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Aucun utilisateur trouvé
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Précédent
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage + 1} sur {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              Suivant
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
