import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  GLOBAL_ROLES, 
  GLOBAL_ROLE_LABELS, 
  GLOBAL_ROLE_COLORS,
  GlobalRole,
  getAllRolesSorted,
  getRoleLevel
} from '@/types/globalRoles';
import {
  getUserManagementCapabilities,
  canViewUser,
  canManageUser,
  canDeactivateUser as canDeactivateUserHelper,
} from '@/config/roleMatrix';
import { 
  MODULE_DEFINITIONS, 
  EnabledModules,
  ModuleOptionsState,
  ModuleKey
} from '@/types/modules';
import { logAuth } from '@/lib/logger';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  Search, 
  Save, 
  ChevronLeft,
  ChevronRight,
  Loader2,
  Info,
  ChevronDown,
  Building2,
  Shield,
  Zap,
  Eye,
  UserPlus,
  MoreHorizontal,
  UserX,
  UserCheck,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  // Legacy fields (lecture seule)
  system_role: string | null;
  role_agence: string | null;
  service_competencies: any;
  support_level: number | null;
  created_at: string;
  // Deactivation fields
  is_active: boolean | null;
  deactivated_at: string | null;
  deactivated_by: string | null;
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
  const { globalRole, suggestedGlobalRole, isAdmin, user, agence: currentUserAgency } = useAuth();
  
  // ============================================================================
  // PERMISSIONS - Utilisant la matrice de gestion centralisée
  // ============================================================================
  const effectiveUserRole = globalRole ?? suggestedGlobalRole;
  const currentUserLevel = getRoleLevel(effectiveUserRole);
  const userManagementCaps = useMemo(
    () => getUserManagementCapabilities(effectiveUserRole),
    [effectiveUserRole]
  );
  
  // N2+ peut accéder à la page (viewScope !== 'none')
  const canAccessPage = userManagementCaps.viewScope !== 'none' || isAdmin;
  
  // Peut créer des utilisateurs si canCreateRoles non vide
  const canCreateUsers = userManagementCaps.canCreateRoles.length > 0;
  
  // Peut supprimer des utilisateurs (hard delete)
  const canDeleteUsers = userManagementCaps.canDeleteUsers;
  
  // Vérifier si on peut modifier un utilisateur donné (utilise le helper centralisé)
  const canEditUser = (targetRole: GlobalRole | null, targetAgency: string | null): boolean => {
    return canManageUser(effectiveUserRole, currentUserAgency, targetRole, targetAgency);
  };
  
  // Vérifier si on peut désactiver un utilisateur donné
  const canDeactivateUserCheck = (targetRole: GlobalRole | null): boolean => {
    return canDeactivateUserHelper(effectiveUserRole, targetRole);
  };
  
  // Vérifier si on peut supprimer un utilisateur donné (hard delete)
  const canDeleteUser = (targetRole: GlobalRole | null): boolean => {
    if (!canDeleteUsers) return false;
    return canDeactivateUserHelper(effectiveUserRole, targetRole);
  };
  
  // Rôles assignables selon la matrice
  const assignableRoles = useMemo(() => userManagementCaps.canCreateRoles, [userManagementCaps]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [agencyFilter, setAgencyFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [showDeactivated, setShowDeactivated] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  
  // Create user dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Deactivation/Delete dialogs
  const [deactivateDialog, setDeactivateDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [reactivateDialog, setReactivateDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    agence: '',
    globalRole: 'franchisee_user' as GlobalRole,
    sendEmail: true,
  });
  
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
        .select('id, email, first_name, last_name, agence, global_role, enabled_modules, system_role, role_agence, service_competencies, support_level, created_at, is_active, deactivated_at, deactivated_by')
        .order('email');
      
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  // Filter users based on viewScope
  const visibleUsers = useMemo(() => {
    if (!users) return [];
    
    return users.filter(u => {
      // Self scope: only see yourself
      if (userManagementCaps.viewScope === 'self') {
        return u.id === user?.id;
      }
      // Use the centralized canViewUser helper for other cases
      return canViewUser(effectiveUserRole, currentUserAgency, u.agence);
    });
  }, [users, userManagementCaps, effectiveUserRole, currentUserAgency, user?.id]);

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
    return visibleUsers.filter(user => {
      // Active status filter (by default, only show active users)
      const isUserActive = user.is_active !== false;
      if (!showDeactivated && !isUserActive) {
        return false;
      }
      
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
  }, [visibleUsers, searchQuery, agencyFilter, roleFilter, moduleFilter, modifiedUsers, showDeactivated]);

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
      logAuth.info(`Permissions sauvegardées pour user ${userId}`);
      toast.success('Permissions enregistrées');
      
      setModifiedUsers(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      
      queryClient.invalidateQueries({ queryKey: ['admin-users-unified'] });
    },
    onError: (error) => {
      logAuth.error('Erreur sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: userData,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Utilisateur créé avec succès');
      setShowCreateDialog(false);
      setNewUserData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        agence: '',
        globalRole: 'franchisee_user',
        sendEmail: true,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users-unified'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Deactivate user mutation
  const deactivateMutation = useMutation({
    mutationFn: async (targetUser: UserProfile) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
          deactivated_by: user?.email || 'unknown',
        })
        .eq('id', targetUser.id);
      
      if (error) throw error;
      return targetUser;
    },
    onSuccess: (targetUser) => {
      logAuth.info(`[ADMIN] Utilisateur désactivé: ${targetUser.email}`);
      toast.success(`${targetUser.email || 'Utilisateur'} a été désactivé`);
      setDeactivateDialog({ open: false, user: null });
      queryClient.invalidateQueries({ queryKey: ['admin-users-unified'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Reactivate user mutation
  const reactivateMutation = useMutation({
    mutationFn: async (targetUser: UserProfile) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_active: true,
          deactivated_at: null,
          deactivated_by: null,
        })
        .eq('id', targetUser.id);
      
      if (error) throw error;
      return targetUser;
    },
    onSuccess: (targetUser) => {
      logAuth.info(`[ADMIN] Utilisateur réactivé: ${targetUser.email}`);
      toast.success(`${targetUser.email || 'Utilisateur'} a été réactivé`);
      setReactivateDialog({ open: false, user: null });
      queryClient.invalidateQueries({ queryKey: ['admin-users-unified'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Hard delete user mutation (superadmin only)
  const hardDeleteMutation = useMutation({
    mutationFn: async (targetUser: UserProfile) => {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: targetUser.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return targetUser;
    },
    onSuccess: (targetUser) => {
      logAuth.info(`[ADMIN] Utilisateur SUPPRIMÉ définitivement: ${targetUser.email}`);
      toast.success(`${targetUser.email || 'Utilisateur'} a été supprimé définitivement`);
      setDeleteDialog({ open: false, user: null });
      queryClient.invalidateQueries({ queryKey: ['admin-users-unified'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur suppression: ${error.message}`);
    },
  });

  // Check if user is superadmin (N6)
  const isSuperAdmin = effectiveUserRole === 'superadmin';

  // Save manual changes
  const saveChanges = (userId: string) => {
    const targetUser = visibleUsers.find(u => u.id === userId);
    const changes = modifiedUsers[userId];
    if (!targetUser || !changes) return;
    
    saveMutation.mutate({
      userId,
      globalRole: changes.global_role ?? targetUser.global_role,
      enabledModules: changes.enabled_modules ?? targetUser.enabled_modules,
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
    const targetUser = visibleUsers.find(u => u.id === userId);
    if (!targetUser) return;
    
    const currentModules = modifiedUsers[userId]?.enabled_modules ?? targetUser.enabled_modules ?? {};
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
    const targetUser = visibleUsers.find(u => u.id === userId);
    if (!targetUser) return;
    
    const currentModules = modifiedUsers[userId]?.enabled_modules ?? targetUser.enabled_modules ?? {};
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
  const getEffectiveRole = (user: UserProfile) => {
    return modifiedUsers[user.id]?.global_role ?? user.global_role;
  };

  const getEffectiveModules = (user: UserProfile): EnabledModules => {
    return modifiedUsers[user.id]?.enabled_modules ?? user.enabled_modules ?? {};
  };

  // Get module options
  const getModuleOptions = (modules: EnabledModules, moduleKey: ModuleKey): Record<string, boolean> => {
    const state = modules[moduleKey];
    if (typeof state === 'object' && state.options) return state.options;
    return {};
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

  // Rediriger si l'utilisateur n'a pas le droit d'accéder à la page
  if (!canAccessPage) {
    return <Navigate to="/" replace />;
  }

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
            <h1 className="text-2xl font-bold">Gestion Utilisateurs & Permissions</h1>
            <p className="text-muted-foreground">
              Gestion des rôles globaux et modules activés par utilisateur
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
          </Badge>
          {canCreateUsers && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Nouvel utilisateur
            </Button>
          )}
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

              {/* Toggle désactivés */}
              <div className="flex items-center space-x-2 border-l pl-4 ml-2">
                <Switch
                  id="showDeactivated"
                  checked={showDeactivated}
                  onCheckedChange={(checked) => { setShowDeactivated(checked); setCurrentPage(0); }}
                />
                <Label htmlFor="showDeactivated" className="text-sm text-muted-foreground cursor-pointer">
                  Inclure désactivés
                </Label>
              </div>
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
              {paginatedUsers.map((userItem) => {
                const effectiveRole = getEffectiveRole(userItem);
                const effectiveModules = getEffectiveModules(userItem);
                const isModified = !!modifiedUsers[userItem.id];
                const userCanBeEdited = canEditUser(userItem.global_role, userItem.agence);
                const userCanBeDeleted = canDeleteUser(userItem.global_role);
                const isDeactivated = userItem.is_active === false;

                return (
                  <AccordionItem key={userItem.id} value={userItem.id} className={`border-0 ${isDeactivated ? 'opacity-60 bg-muted/30' : ''}`}>
                    <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 hover:no-underline">
                      <div className="flex items-center gap-4 flex-1 text-left">
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium shrink-0 ${isDeactivated ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                          {getInitials(userItem)}
                        </div>
                        
                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{getDisplayName(userItem)}</div>
                          <div className="text-sm text-muted-foreground truncate">{userItem.email || 'Pas d\'email'}</div>
                        </div>

                        {/* Agency */}
                        <div className="hidden md:block w-32 text-sm text-muted-foreground truncate">
                          {userItem.agence || 'Sans agence'}
                        </div>

                        {/* Poste */}
                        <div className="hidden lg:block w-28 text-sm text-muted-foreground">
                          {ROLE_AGENCE_LABELS[userItem.role_agence || ''] || userItem.role_agence || '-'}
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

                        {/* Modified indicator */}
                        {isModified && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            Modifié
                          </Badge>
                        )}

                        {/* Deactivated indicator */}
                        {userItem.is_active === false && (
                          <Badge variant="destructive" className="shrink-0">
                            <UserX className="w-3 h-3 mr-1" />
                            Désactivé
                          </Badge>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {userCanBeEdited ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => saveChanges(userItem.id)}
                              disabled={!isModified || saveMutation.isPending}
                            >
                              <Save className="w-4 h-4 mr-1" />
                              Sauver
                            </Button>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-muted-foreground">
                                  Lecture seule
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                Vous ne pouvez pas modifier cet utilisateur (niveau supérieur ou autre agence)
                              </TooltipContent>
                            </Tooltip>
                          )}

                          {/* Action menu for superadmin */}
                          {isSuperAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {userItem.is_active !== false ? (
                                  <DropdownMenuItem
                                    onClick={() => setDeactivateDialog({ open: true, user: userItem })}
                                    className="text-orange-600"
                                  >
                                    <UserX className="w-4 h-4 mr-2" />
                                    Désactiver l'utilisateur
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => setReactivateDialog({ open: true, user: userItem })}
                                    className="text-green-600"
                                  >
                                    <UserCheck className="w-4 h-4 mr-2" />
                                    Réactiver l'utilisateur
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteDialog({ open: true, user: userItem })}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Supprimer définitivement
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                        {/* Configuration */}
                        <div className="space-y-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Configuration des permissions
                            {!userCanBeEdited && (
                              <Badge variant="outline" className="ml-2 text-muted-foreground">Lecture seule</Badge>
                            )}
                          </h4>
                          
                          {/* Global Role Selector */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Rôle global</label>
                            <Select
                              value={effectiveRole || ''}
                              onValueChange={(v) => handleRoleChange(userItem.id, v as GlobalRole)}
                              disabled={!userCanBeEdited}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un rôle" />
                              </SelectTrigger>
                              <SelectContent>
                                {assignableRoles.map(role => (
                                  <SelectItem key={role} value={role}>
                                    N{GLOBAL_ROLES[role]} – {GLOBAL_ROLE_LABELS[role]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {userCanBeEdited && assignableRoles.length < 7 && (
                              <p className="text-xs text-amber-600">
                                Vous pouvez assigner des rôles jusqu'à N{effectiveUserRole ? GLOBAL_ROLES[effectiveUserRole] : 0}
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
                                          onCheckedChange={(checked) => handleModuleToggle(userItem.id, moduleDef.key, checked)}
                                          disabled={!userCanBeEdited}
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
                                                      onCheckedChange={(checked) => handleOptionToggle(userItem.id, moduleDef.key, opt.key, !!checked)}
                                                      disabled={!isEnabled || !userCanBeEdited}
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
                              Informations complémentaires
                              <ChevronDown className="w-4 h-4" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-3 space-y-3">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Créé le:</span>
                                  <p>{new Date(userItem.created_at).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Poste occupé:</span>
                                  <p>{ROLE_AGENCE_LABELS[userItem.role_agence || ''] || userItem.role_agence || '-'}</p>
                                </div>
                                {userItem.system_role && (
                                  <div>
                                    <span className="text-muted-foreground">System role (legacy):</span>
                                    <p>{userItem.system_role}</p>
                                  </div>
                                )}
                                {userItem.support_level !== null && userItem.support_level > 0 && (
                                  <div>
                                    <span className="text-muted-foreground">Support level:</span>
                                    <p>{userItem.support_level}</p>
                                  </div>
                                )}
                              </div>
                              
                              {userItem.service_competencies && Object.keys(userItem.service_competencies).length > 0 && (
                                <div>
                                  <span className="text-muted-foreground text-sm">Compétences service:</span>
                                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                                    {JSON.stringify(userItem.service_competencies, null, 2)}
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

        {/* Create User Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Nouvel utilisateur
              </DialogTitle>
              <DialogDescription>
                Créer un nouveau compte utilisateur
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input
                    id="firstName"
                    value={newUserData.firstName}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Jean"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input
                    id="lastName"
                    value={newUserData.lastName}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Dupont"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="jean.dupont@agence.fr"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe temporaire *</Label>
                <Input
                  id="password"
                  type="text"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Min 8 car. avec Maj, min, chiffre, symbole"
                />
                <p className="text-xs text-muted-foreground">
                  L'utilisateur devra le changer à la première connexion
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agence">Agence</Label>
                <Input
                  id="agence"
                  value={currentUserLevel === GLOBAL_ROLES.franchisee_admin ? (currentUserAgency || '') : newUserData.agence}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, agence: e.target.value }))}
                  placeholder="Nom de l'agence"
                  disabled={currentUserLevel === GLOBAL_ROLES.franchisee_admin}
                />
                {currentUserLevel === GLOBAL_ROLES.franchisee_admin && (
                  <p className="text-xs text-amber-600">
                    En tant que N2, vous ne pouvez créer que dans votre agence
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="globalRole">Rôle global</Label>
                <Select
                  value={newUserData.globalRole}
                  onValueChange={(v) => setNewUserData(prev => ({ ...prev, globalRole: v as GlobalRole }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map(role => (
                      <SelectItem key={role} value={role}>
                        N{GLOBAL_ROLES[role]} – {GLOBAL_ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="sendEmail"
                  checked={newUserData.sendEmail}
                  onCheckedChange={(checked) => setNewUserData(prev => ({ ...prev, sendEmail: checked }))}
                />
                <Label htmlFor="sendEmail">Envoyer l'email avec les identifiants</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => createUserMutation.mutate({
                  ...newUserData,
                  agence: currentUserLevel === GLOBAL_ROLES.franchisee_admin ? (currentUserAgency || '') : newUserData.agence,
                })}
                disabled={!newUserData.email || !newUserData.password || !newUserData.firstName || createUserMutation.isPending}
              >
                {createUserMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deactivate Dialog */}
        <AlertDialog open={deactivateDialog.open} onOpenChange={(open) => setDeactivateDialog({ open, user: deactivateDialog.user })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Désactiver l'utilisateur ?</AlertDialogTitle>
              <AlertDialogDescription>
                L'utilisateur <strong>{deactivateDialog.user?.email}</strong> ne pourra plus se connecter, 
                mais ses données resteront dans les historiques (tickets, statistiques, etc.).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deactivateDialog.user && deactivateMutation.mutate(deactivateDialog.user)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {deactivateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserX className="w-4 h-4 mr-2" />
                )}
                Désactiver
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reactivate Dialog */}
        <AlertDialog open={reactivateDialog.open} onOpenChange={(open) => setReactivateDialog({ open, user: reactivateDialog.user })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Réactiver l'utilisateur ?</AlertDialogTitle>
              <AlertDialogDescription>
                L'utilisateur <strong>{reactivateDialog.user?.email}</strong> pourra à nouveau se connecter.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => reactivateDialog.user && reactivateMutation.mutate(reactivateDialog.user)}
                className="bg-green-600 hover:bg-green-700"
              >
                {reactivateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserCheck className="w-4 h-4 mr-2" />
                )}
                Réactiver
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Hard Delete Dialog */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, user: deleteDialog.user })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">Supprimer définitivement ?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong className="text-destructive">ATTENTION :</strong> Cette action est irréversible.
                Toutes les données de l'utilisateur <strong>{deleteDialog.user?.email}</strong> seront 
                définitivement supprimées (profil, tickets, historiques, etc.).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDialog.user && hardDeleteMutation.mutate(deleteDialog.user)}
                className="bg-destructive hover:bg-destructive/90"
              >
                {hardDeleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Supprimer définitivement
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
