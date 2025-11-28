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

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Shield, 
  Search, 
  Check, 
  Save, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  MinusCircle,
  Users,
  Loader2,
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Json } from '@/integrations/supabase/types';

interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  agence: string | null;
  global_role: GlobalRole | null;
  enabled_modules: EnabledModules | null;
  // Legacy fields for suggestion calculation
  system_role: string | null;
  role_agence: string | null;
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

const PAGE_SIZE = 20;

export default function AdminPermissionsV2() {
  const queryClient = useQueryClient();
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [agencyFilter, setAgencyFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  
  // Track modified rows
  const [modifiedUsers, setModifiedUsers] = useState<Record<string, {
    global_role?: GlobalRole | null;
    enabled_modules?: EnabledModules | null;
  }>>({});

  // Fetch users with profiles
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-permissions-v2-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, agence, global_role, enabled_modules, system_role, role_agence')
        .order('email');
      
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  // Fetch user capabilities
  const { data: capabilities } = useQuery({
    queryKey: ['admin-permissions-v2-capabilities'],
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
    queryKey: ['admin-permissions-v2-roles'],
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
    queryKey: ['admin-permissions-v2-franchiseur-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franchiseur_roles')
        .select('user_id, franchiseur_role');
      
      if (error) throw error;
      return data;
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
      };
    });
  }, [users, capabilities, userRoles, franchiseurRoles]);

  // Get unique agencies
  const agencies = useMemo(() => {
    if (!users) return [];
    const agencySet = new Set(users.map(u => u.agence).filter(Boolean) as string[]);
    return Array.from(agencySet).sort();
  }, [users]);

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
      
      return true;
    });
  }, [usersWithSuggestions, searchQuery, agencyFilter, roleFilter, modifiedUsers]);

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
      
      // Remove from modified list
      setModifiedUsers(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      
      queryClient.invalidateQueries({ queryKey: ['admin-permissions-v2-users'] });
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
      // Create new module state with default options
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

  // Get effective values (modified or original)
  const getEffectiveRole = (user: typeof usersWithSuggestions[0]) => {
    return modifiedUsers[user.id]?.global_role ?? user.global_role;
  };

  const getEffectiveModules = (user: typeof usersWithSuggestions[0]): EnabledModules => {
    return modifiedUsers[user.id]?.enabled_modules ?? user.enabled_modules ?? {};
  };

  // Check if module is enabled
  const isModuleEnabledForUser = (modules: EnabledModules, moduleKey: ModuleKey): boolean => {
    const state = modules[moduleKey];
    if (typeof state === 'boolean') return state;
    if (typeof state === 'object') return state.enabled;
    return false;
  };

  // Get module options
  const getModuleOptions = (modules: EnabledModules, moduleKey: ModuleKey): Record<string, boolean> => {
    const state = modules[moduleKey];
    if (typeof state === 'object' && state.options) return state.options;
    return {};
  };

  // Status comparison
  const getStatusIndicator = (user: typeof usersWithSuggestions[0]) => {
    const effectiveRole = getEffectiveRole(user);
    const effectiveModules = getEffectiveModules(user);
    
    const roleMatch = effectiveRole === user.suggestedGlobalRole;
    const modulesMatch = JSON.stringify(effectiveModules) === JSON.stringify(user.suggestedEnabledModules);
    
    if (!effectiveRole && !user.suggestedGlobalRole) {
      return { status: 'empty', label: 'Non configuré', color: 'bg-muted text-muted-foreground' };
    }
    if (!effectiveRole) {
      return { status: 'pending', label: 'À appliquer', color: 'bg-orange-100 text-orange-800' };
    }
    if (roleMatch && modulesMatch) {
      return { status: 'ok', label: 'V2 OK', color: 'bg-green-100 text-green-800' };
    }
    return { status: 'different', label: 'Différent', color: 'bg-red-100 text-red-800' };
  };

  // User initials
  const getInitials = (user: UserProfile) => {
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || '?';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Permissions V2</h1>
          <p className="text-muted-foreground">
            Gestion des rôles globaux et des modules activés
          </p>
        </div>
        <Badge variant="outline" className="ml-auto text-lg px-4 py-2">
          <Users className="w-4 h-4 mr-2" />
          {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Filters Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border rounded-lg p-4 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher (nom, email, agence)..."
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
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tous rôles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous rôles</SelectItem>
            {getAllRolesSorted().map(role => (
              <SelectItem key={role} value={role}>
                N{GLOBAL_ROLES[role]} – {GLOBAL_ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {usersLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <TooltipProvider>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[220px]">Utilisateur</TableHead>
                <TableHead className="w-[120px]">Agence</TableHead>
                <TableHead className="w-[200px]">Rôle global</TableHead>
                <TableHead className="w-[160px]">
                  <div className="flex items-center gap-1">
                    Suggestion
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px]">
                        <p>Rôle suggéré calculé automatiquement à partir des permissions V1 (legacy). Utilisez "V2" pour appliquer cette suggestion.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead className="min-w-[300px]">Modules</TableHead>
                <TableHead className="w-[100px]">
                  <div className="flex items-center gap-1">
                    Statut
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px]">
                        <p><strong>V2 OK</strong> : Configuration V2 alignée avec les suggestions.<br/>
                        <strong>À appliquer</strong> : Valeurs V2 vides, suggestion disponible.<br/>
                        <strong>Différent</strong> : Configuration V2 différente de la suggestion.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead className="w-[140px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user, idx) => {
                const effectiveRole = getEffectiveRole(user);
                const effectiveModules = getEffectiveModules(user);
                const isModified = !!modifiedUsers[user.id];
                const statusInfo = getStatusIndicator(user);
                
                return (
                  <TableRow 
                    key={user.id} 
                    className={`${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'} ${isModified ? 'ring-2 ring-primary/20' : ''}`}
                  >
                    {/* User */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                          {getInitials(user)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {user.first_name || user.last_name 
                              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                              : 'Sans nom'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {user.email || 'Pas d\'email'}
                          </div>
                        </div>
                        {isModified && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" title="Modifié" />
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Agency */}
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {user.agence || 'Sans agence'}
                      </Badge>
                    </TableCell>
                    
                    {/* Global Role */}
                    <TableCell>
                      <Select 
                        value={effectiveRole || ''} 
                        onValueChange={(v) => handleRoleChange(user.id, v as GlobalRole)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Non défini">
                            {effectiveRole && (
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${GLOBAL_ROLE_COLORS[effectiveRole]}`}>
                                N{GLOBAL_ROLES[effectiveRole]} – {GLOBAL_ROLE_LABELS[effectiveRole]}
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {getAllRolesSorted().map(role => (
                            <SelectItem key={role} value={role}>
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${GLOBAL_ROLE_COLORS[role]}`}>
                                N{GLOBAL_ROLES[role]} – {GLOBAL_ROLE_LABELS[role]}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    
                    {/* Suggested Role */}
                    <TableCell>
                      {user.suggestedGlobalRole ? (
                        <Badge 
                          variant="outline" 
                          className={effectiveRole === user.suggestedGlobalRole 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-muted text-muted-foreground'
                          }
                        >
                          {effectiveRole === user.suggestedGlobalRole && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          N{GLOBAL_ROLES[user.suggestedGlobalRole]}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          <MinusCircle className="w-3 h-3 mr-1" />
                          Aucun
                        </Badge>
                      )}
                    </TableCell>
                    
                    {/* Modules */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {MODULE_DEFINITIONS.map(moduleDef => {
                          const isEnabled = isModuleEnabledForUser(effectiveModules, moduleDef.key);
                          const options = getModuleOptions(effectiveModules, moduleDef.key);
                          
                          return (
                            <Popover key={moduleDef.key}>
                              <PopoverTrigger asChild>
                                <button
                                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border transition-colors ${
                                    isEnabled 
                                      ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' 
                                      : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
                                  }`}
                                >
                                  <Switch
                                    checked={isEnabled}
                                    onCheckedChange={(checked) => handleModuleToggle(user.id, moduleDef.key, checked)}
                                    className="scale-75"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span className="truncate max-w-[80px]">{moduleDef.label}</span>
                                  <ChevronDown className="w-3 h-3 flex-shrink-0" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-3" align="start">
                                <div className="space-y-3">
                                  <div className="font-medium text-sm">{moduleDef.label}</div>
                                  <p className="text-xs text-muted-foreground">{moduleDef.description}</p>
                                  <div className="border-t pt-2 space-y-2">
                                    {moduleDef.options.map(opt => (
                                      <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer">
                                        <Checkbox
                                          checked={options[opt.key] ?? opt.defaultEnabled}
                                          onCheckedChange={(checked) => 
                                            handleOptionToggle(user.id, moduleDef.key, opt.key, !!checked)
                                          }
                                          disabled={!isEnabled}
                                        />
                                        <span className={!isEnabled ? 'text-muted-foreground' : ''}>
                                          {opt.label}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          );
                        })}
                      </div>
                    </TableCell>
                    
                    {/* Status */}
                    <TableCell>
                      <Badge className={statusInfo.color}>
                        {statusInfo.status === 'ok' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {statusInfo.status === 'pending' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {statusInfo.status === 'different' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    
                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {isModified && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => saveChanges(user.id)}
                            disabled={saveMutation.isPending}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Sauver
                          </Button>
                        )}
                        {!isModified && statusInfo.status !== 'ok' && user.suggestedGlobalRole && (
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => applyV2(user)}
                            disabled={saveMutation.isPending}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            V2
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        </TooltipProvider>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage + 1} sur {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Précédent
            </Button>
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
        </div>
      )}
    </div>
  );
}
