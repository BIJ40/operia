/**
 * Onglet Utilisateurs - Gestion simplifiée des accès
 * Les modules sont gérés inline via badges cliquables
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Users, UserPlus, MoreHorizontal, UserX, UserCheck, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Lock } from 'lucide-react';
import { GLOBAL_ROLE_LABELS, type GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { isHardcodedProtectedUser } from '@/hooks/access-rights/useProtectedAccess';
import { getVisibleRoleLabel, getVisibleRoleColor } from '@/lib/visibleRoleLabels';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllAgencySubscriptions, useAccessRightsUsers, useUpdateAgencySubscription, UserRow } from '@/hooks/access-rights';
import { useAllPageOverrides, usePageOverrideMutation } from '@/hooks/access-rights/useUserPageOverrides';
import { CreateUserDialog, DeactivateDialog, ReactivateDialog, DeleteDialog } from '@/components/admin/users/UserDialogs';
import { InlineModuleBadges } from '@/components/admin/users/InlineModuleBadges';
import { UserFullDialog } from '@/components/admin/users/UserFullDialog';
import type { ModuleKey, EnabledModules } from '@/types/modules';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

type SortKey = 'name' | 'email' | 'poste' | 'role' | 'agence' | 'plan' | 'statut';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export function UsersAccessTab() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  
  const {
    users,
    agencies,
    isLoading,
    capabilities,
    currentUserLevel,
    currentUserAgency,
    selectedUser,
    setSelectedUser,
    createDialogOpen,
    setCreateDialogOpen,
    deactivateDialogOpen,
    setDeactivateDialogOpen,
    reactivateDialogOpen,
    setReactivateDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    createUserMutation,
    updateUserMutation,
    updateEmailMutation,
    resetPasswordMutation,
    deactivateMutation,
    reactivateMutation,
    hardDeleteMutation,
    saveModulesMutation,
    openDeactivateDialog,
    openReactivateDialog,
    openDeleteDialog,
    canEditUser,
  } = useAccessRightsUsers();
  
  const { data: subscriptions } = useAllAgencySubscriptions();
  const { data: allPageOverrides } = useAllPageOverrides();
  const pageOverrideMutation = usePageOverrideMutation();
  const updateSubscription = useUpdateAgencySubscription();
  const { hasGlobalRole } = useAuth();
  
  // Admin N4+ can edit agency plans
  const canEditPlan = hasGlobalRole('franchisor_admin');
  
  // Create user page overrides map
  const userPageOverridesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    allPageOverrides?.forEach(override => {
      const existing = map.get(override.user_id) || [];
      existing.push(override.page_path);
      map.set(override.user_id, existing);
    });
    return map;
  }, [allPageOverrides]);
  
  // Create agency plan map
  const agencyPlanMap = useMemo(() => {
    const map = new Map<string, string>();
    subscriptions?.forEach(sub => {
      map.set(sub.agency_id, sub.tier_key);
    });
    return map;
  }, [subscriptions]);

  // Handle sort
  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sort icon component
  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4 ml-1" />
      : <ChevronDown className="h-4 w-4 ml-1" />;
  };
  
  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let result = users.filter(user => {
      const matchesSearch = !search || 
        user.email?.toLowerCase().includes(search.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(search.toLowerCase()) ||
        user.agency?.label?.toLowerCase().includes(search.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || user.global_role === roleFilter;
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && user.is_active) ||
        (statusFilter === 'inactive' && !user.is_active);
      
      return matchesSearch && matchesRole && matchesStatus;
    });

    // Sort
    result.sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      switch (sortConfig.key) {
        case 'name':
          const nameA = `${a.last_name || ''} ${a.first_name || ''}`.toLowerCase();
          const nameB = `${b.last_name || ''} ${b.first_name || ''}`.toLowerCase();
          return nameA.localeCompare(nameB) * direction;
        case 'email':
          return (a.email || '').localeCompare(b.email || '') * direction;
        case 'poste':
          return (a.role_agence || '').localeCompare(b.role_agence || '') * direction;
        case 'role':
          const levelA = GLOBAL_ROLES[a.global_role as GlobalRole] ?? 0;
          const levelB = GLOBAL_ROLES[b.global_role as GlobalRole] ?? 0;
          return (levelA - levelB) * direction;
        case 'agence':
          return (a.agency?.label || '').localeCompare(b.agency?.label || '') * direction;
        case 'plan':
          const planA = a.agency_id ? agencyPlanMap.get(a.agency_id) || '' : '';
          const planB = b.agency_id ? agencyPlanMap.get(b.agency_id) || '' : '';
          return planA.localeCompare(planB) * direction;
        case 'statut':
          return ((a.is_active ? 1 : 0) - (b.is_active ? 1 : 0)) * direction;
        default:
          return 0;
      }
    });

    return result;
  }, [users, search, roleFilter, statusFilter, sortConfig, agencyPlanMap]);

  // Inline module toggle - sauvegarde immédiate
  const handleInlineModuleToggle = (user: UserRow, moduleKey: ModuleKey, enabled: boolean, optionKey?: string) => {
    const currentModules = user.enabled_modules || {};
    const currentModule = currentModules[moduleKey];
    const currentOptions = typeof currentModule === 'object' ? currentModule?.options || {} : {};
    
    let newModules: EnabledModules;
    
    if (optionKey) {
      const newOptions = { ...currentOptions, [optionKey]: enabled };
      const hasAnyOption = Object.values(newOptions).some(v => v === true);
      newModules = {
        ...currentModules,
        [moduleKey]: { enabled: hasAnyOption || enabled, options: newOptions }
      };
    } else {
      newModules = {
        ...currentModules,
        [moduleKey]: { enabled, options: currentOptions }
      };
    }
    
    saveModulesMutation.mutate({ userId: user.id, enabledModules: newModules });
  };

  // Save user from dialog
  const handleSaveUser = async (user: UserRow, data: {
    first_name: string;
    last_name: string;
    email: string;
    agence: string;
    agency_id: string | null;
    role_agence: string;
    global_role: GlobalRole;
    apogee_user_id: number | null;
  }) => {
    // Check if email changed
    const emailChanged = data.email !== user.email;
    
    try {
      if (emailChanged && data.email) {
        await updateEmailMutation.mutateAsync({ userId: user.id, newEmail: data.email });
      }
      
      await updateUserMutation.mutateAsync({
        userId: user.id,
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          agence: data.agence,
          agency_id: data.agency_id,
          role_agence: data.role_agence,
          global_role: data.global_role,
          apogee_user_id: data.apogee_user_id,
        },
        enabledModules: user.enabled_modules,
      });
    } catch {
      // Errors handled by mutations
    }
  };

  // Convert UserRow to profile for dialogs
  const userAsProfile = useMemo(() => {
    if (!selectedUser) return null;
    return selectedUser;
  }, [selectedUser]);

  // Sortable header component
  const SortableHeader = ({ columnKey, children, className }: { columnKey: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead 
      className={cn("cursor-pointer select-none hover:bg-muted/50 transition-colors", className)}
      onClick={() => handleSort(columnKey)}
    >
      <div className="flex items-center">
        {children}
        <SortIcon columnKey={columnKey} />
      </div>
    </TableHead>
  );

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Utilisateurs
            </CardTitle>
            <CardDescription>
              Gérez les utilisateurs et leurs accès
            </CardDescription>
          </div>
          {capabilities.canCreateRoles.length > 0 && (
            <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Nouveau
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email ou agence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              {Object.entries(GLOBAL_ROLE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="inactive">Inactifs</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Table simplifiée */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader columnKey="name">Nom</SortableHeader>
                <SortableHeader columnKey="email" className="hidden lg:table-cell">Email</SortableHeader>
                <SortableHeader columnKey="role">Rôle</SortableHeader>
                <SortableHeader columnKey="agence" className="hidden md:table-cell">Agence</SortableHeader>
                <TableHead className="hidden sm:table-cell">Accès spéciaux</TableHead>
                <SortableHeader columnKey="statut" className="hidden sm:table-cell">Statut</SortableHeader>
                <TableHead className="text-right w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-6 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const canEdit = canEditUser(user);
                  
                  return (
                    <TableRow 
                      key={user.id} 
                      className={cn(
                        !user.is_active && 'opacity-60',
                        canEdit && 'hover:bg-muted/50'
                      )}
                    >
                      <TableCell className="font-medium whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          {isHardcodedProtectedUser(user.id) && (
                            <Lock className="h-3 w-3 text-warning" />
                          )}
                          {user.first_name} {user.last_name}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge className={getVisibleRoleColor(user.global_role)} variant="secondary">
                          {getVisibleRoleLabel(user.global_role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {user.role_agence?.toLowerCase().includes('tête de réseau') || 
                         user.role_agence?.toLowerCase().includes('tete de reseau') ||
                         user.role_agence?.toLowerCase().includes('tete_de_reseau') ? (
                          <span className="font-medium text-primary">SIÈGE</span>
                        ) : user.agency?.label ? (
                          user.agency.label
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <InlineModuleBadges
                          userId={user.id}
                          enabledModules={user.enabled_modules}
                          canEdit={canEdit}
                          onToggle={(moduleKey, enabled, optionKey) => {
                            handleInlineModuleToggle(user, moduleKey, enabled, optionKey);
                          }}
                        />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={user.is_active ? 'default' : 'secondary'} className="text-xs">
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <UserFullDialog
                            userId={user.id}
                            userName={`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Utilisateur'}
                            userEmail={user.email || ''}
                            firstName={user.first_name || ''}
                            lastName={user.last_name || ''}
                            globalRole={user.global_role as GlobalRole}
                            agencyId={user.agency_id}
                            agencySlug={user.agence}
                            agencyLabel={user.agency?.label}
                            roleAgence={user.role_agence}
                            isActive={user.is_active ?? true}
                            mustChangePassword={user.must_change_password ?? false}
                            apogeeUserId={user.apogee_user_id}
                            enabledModules={user.enabled_modules}
                            planKey={user.agency_id ? agencyPlanMap.get(user.agency_id) : undefined}
                            planLabel={user.agency_id ? agencyPlanMap.get(user.agency_id) : undefined}
                            canEdit={canEditPlan || canEdit}
                            pageOverrides={userPageOverridesMap.get(user.id) || []}
                            agencies={agencies}
                            assignableRoles={capabilities.canEditRoles}
                            onPlanChange={(newPlanKey) => {
                              if (user.agency_id) {
                                updateSubscription.mutate({ agencyId: user.agency_id, tierKey: newPlanKey });
                              }
                            }}
                            onModuleToggle={(moduleKey, enabled, optionKey) => {
                              handleInlineModuleToggle(user, moduleKey, enabled, optionKey);
                            }}
                            onPageOverrideToggle={(pagePath, enabled) => {
                              pageOverrideMutation.mutate({ userId: user.id, pagePath, enabled });
                            }}
                            onSaveUser={(data) => handleSaveUser(user, data)}
                            onUpdateEmail={(newEmail) => {
                              updateEmailMutation.mutate({ userId: user.id, newEmail });
                            }}
                            onResetPassword={(newPassword) => {
                              resetPasswordMutation.mutate({ userId: user.id, newPassword });
                            }}
                            isSaving={updateUserMutation.isPending}
                            isEmailPending={updateEmailMutation.isPending}
                            isPasswordPending={resetPasswordMutation.isPending}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.is_active ? (
                              <DropdownMenuItem 
                                onClick={() => openDeactivateDialog(user)}
                                disabled={!canEdit}
                                className="text-orange-600"
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Désactiver
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => openReactivateDialog(user)}
                                disabled={!canEdit}
                                className="text-green-600"
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Réactiver
                              </DropdownMenuItem>
                            )}
                            
                            {capabilities.canDeleteUsers && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => openDeleteDialog(user)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer définitivement
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {filteredUsers.length} utilisateur(s) sur {users.length}
        </div>
      </CardContent>
      
      {/* Dialogs */}
      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={(data) => createUserMutation.mutate(data)}
        isPending={createUserMutation.isPending}
        assignableRoles={capabilities.canCreateRoles}
        agencies={agencies}
        currentUserLevel={currentUserLevel}
        currentUserAgency={currentUserAgency}
      />
      
      <DeactivateDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        onConfirm={() => selectedUser && deactivateMutation.mutate(selectedUser)}
        isPending={deactivateMutation.isPending}
        user={userAsProfile}
      />
      
      <ReactivateDialog
        open={reactivateDialogOpen}
        onOpenChange={setReactivateDialogOpen}
        onConfirm={() => selectedUser && reactivateMutation.mutate(selectedUser)}
        isPending={reactivateMutation.isPending}
        user={userAsProfile}
      />
      
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => selectedUser && hardDeleteMutation.mutate(selectedUser)}
        isPending={hardDeleteMutation.isPending}
        user={userAsProfile}
      />
    </Card>
  );
}
