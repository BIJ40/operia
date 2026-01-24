/**
 * Onglet Utilisateurs - Gestion complète des accès par utilisateur
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Users, UserPlus, MoreHorizontal, Pencil, UserX, UserCheck, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Lock } from 'lucide-react';
import { GLOBAL_ROLE_LABELS, GLOBAL_ROLE_COLORS, type GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { isHardcodedProtectedUser } from '@/hooks/access-rights/useProtectedAccess';
import { getVisibleRoleLabel, getVisibleRoleColor } from '@/lib/visibleRoleLabels';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllAgencySubscriptions, useAccessRightsUsers, UserRow } from '@/hooks/access-rights';
import { CreateUserDialog, EditUserDialog, DeactivateDialog, ReactivateDialog, DeleteDialog } from '@/components/admin/users/UserDialogs';
import type { UpdateUserPayload } from '@/components/users/UserEditForm';
import { ModuleKey, EnabledModules } from '@/types/modules';
import { cn } from '@/lib/utils';

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
  
  // Local module state for editing
  const [localModules, setLocalModules] = useState<EnabledModules | null>(null);
  
  const {
    users,
    agencies,
    isLoading,
    capabilities,
    currentUserLevel,
    currentUserAgency,
    selectedUser,
    setSelectedUser,
    editDialogOpen,
    setEditDialogOpen,
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
    openEditDialog,
    openDeactivateDialog,
    openReactivateDialog,
    openDeleteDialog,
    canEditUser,
  } = useAccessRightsUsers();
  
  const { data: subscriptions } = useAllAgencySubscriptions();
  
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

  const getRoleBadgeColor = (role: GlobalRole | null) => {
    if (!role) return 'bg-muted';
    return GLOBAL_ROLE_COLORS[role] || 'bg-muted';
  };
  
  const getPlanBadgeColor = (plan: string | undefined) => {
    switch (plan) {
      case 'PRO': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'STARTER': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      case 'FREE': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted/50';
    }
  };

  // Handle edit dialog open - initialize local modules state
  const handleOpenEditDialog = (user: UserRow) => {
    setLocalModules(user.enabled_modules);
    openEditDialog(user);
  };

  // Module toggle handler
  const handleModuleToggle = (moduleKey: ModuleKey, enabled: boolean) => {
    setLocalModules(prev => {
      const currentModule = prev?.[moduleKey];
      const currentOptions = typeof currentModule === 'object' ? currentModule?.options || {} : {};
      return {
        ...prev,
        [moduleKey]: { enabled, options: currentOptions }
      };
    });
  };

  // Module option toggle handler
  const handleModuleOptionToggle = (moduleKey: ModuleKey, optionKey: string, enabled: boolean) => {
    setLocalModules(prev => {
      const currentModule = prev?.[moduleKey];
      const wasEnabled = typeof currentModule === 'object' ? currentModule?.enabled ?? false : !!currentModule;
      const currentOptions = typeof currentModule === 'object' ? currentModule?.options || {} : {};
      
      // Si on active une option, le module doit aussi être activé
      // Si on désactive une option, on garde le module actif seulement s'il reste des options actives
      const newOptions = {
        ...currentOptions,
        [optionKey]: enabled
      };
      const hasAnyOptionEnabled = Object.values(newOptions).some(v => v === true);
      const shouldBeEnabled = enabled ? true : (wasEnabled || hasAnyOptionEnabled);
      
      return {
        ...prev,
        [moduleKey]: {
          enabled: shouldBeEnabled,
          options: newOptions
        }
      };
    });
  };

  // Fermeture du dialog : sauvegarde automatique des modules si modifiés
  const handleCloseEditDialog = (open: boolean) => {
    setEditDialogOpen(open);

    if (!open && selectedUser) {
      const prevJson = JSON.stringify(selectedUser.enabled_modules ?? null);
      const nextJson = JSON.stringify(localModules ?? null);

      if (prevJson !== nextJson) {
        saveModulesMutation.mutate({ userId: selectedUser.id, enabledModules: localModules ?? null });
      }

      setLocalModules(null);
      setSelectedUser(null);
    }
  };

  // Sauvegarde unifiée: si l'email a changé, le sauvegarder aussi (via fonction backend), puis fermer le dialog
  const handleSaveUser = async (payload: UpdateUserPayload) => {
    if (!selectedUser) return;

    const nextEmail = (payload.email ?? '').trim();
    const emailChanged = !!nextEmail && nextEmail !== (selectedUser.email ?? '');

    const data = {
      first_name: payload.first_name,
      last_name: payload.last_name,
      agence: payload.agence,
      agency_id: payload.agency_id,
      role_agence: payload.role_agence,
      global_role: payload.global_role,
      support_level: payload.support_level,
      apogee_user_id: payload.apogee_user_id,
    };

    try {
      if (emailChanged) {
        await updateEmailMutation.mutateAsync({ userId: selectedUser.id, newEmail: nextEmail });
      }

      await updateUserMutation.mutateAsync({ userId: selectedUser.id, data, enabledModules: localModules });

      setEditDialogOpen(false);
      setLocalModules(null);
      setSelectedUser(null);
    } catch {
      // Les toasts d'erreur sont gérés par les mutations
    }
  };

  // Convert UserRow to UserProfile format for dialogs (mémoïsé pour éviter les resets de formulaire)
  const userAsProfile = useMemo(() => {
    if (!selectedUser) return null;
    return {
      ...selectedUser,
      enabled_modules: localModules ?? selectedUser.enabled_modules,
    };
  }, [selectedUser, localModules]);

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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Utilisateurs et Accès
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              Gérez les utilisateurs, leurs rôles et leurs accès modules.
              <span className="text-green-600 font-medium">
                Les modules ici s'ajoutent au plan agence (Priorité 2/4).
              </span>
            </CardDescription>
          </div>
          {capabilities.canCreateRoles.length > 0 && (
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Nouvel utilisateur
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
        
        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader columnKey="name">Nom</SortableHeader>
                <SortableHeader columnKey="email" className="hidden md:table-cell">Email</SortableHeader>
                <SortableHeader columnKey="poste" className="hidden lg:table-cell">Poste</SortableHeader>
                <SortableHeader columnKey="role">Rôle</SortableHeader>
                <SortableHeader columnKey="agence" className="hidden sm:table-cell">Agence</SortableHeader>
                <SortableHeader columnKey="plan" className="hidden lg:table-cell">Plan</SortableHeader>
                <SortableHeader columnKey="statut">Statut</SortableHeader>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-40" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const agencyPlan = user.agency_id ? agencyPlanMap.get(user.agency_id) : undefined;
                  const canEdit = canEditUser(user);
                  
                  return (
                    <TableRow 
                      key={user.id} 
                      className={cn(
                        !user.is_active && 'opacity-60',
                        canEdit && 'cursor-pointer hover:bg-muted/50'
                      )}
                      onDoubleClick={() => canEdit && handleOpenEditDialog(user)}
                    >
                      <TableCell className="font-medium whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          {isHardcodedProtectedUser(user.id) && (
                            <Lock className="h-3 w-3 text-amber-500" />
                          )}
                          {user.first_name} {user.last_name}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {user.role_agence || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getVisibleRoleColor(user.global_role)}>
                          {getVisibleRoleLabel(user.global_role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {user.role_agence?.toLowerCase().includes('tête de réseau') || 
                         user.role_agence?.toLowerCase().includes('tete de reseau') ||
                         user.role_agence?.toLowerCase().includes('tete_de_reseau') ? (
                          <span className="font-medium text-primary">SIÈGE</span>
                        ) : user.agency?.label ? (
                          user.agency.label
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {agencyPlan ? (
                          <Badge className={getPlanBadgeColor(agencyPlan)}>
                            {agencyPlan}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleOpenEditDialog(user)}
                              disabled={!canEdit}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
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
      
      <EditUserDialog
        user={userAsProfile}
        open={editDialogOpen}
        onOpenChange={handleCloseEditDialog}
        onSave={handleSaveUser}
        onUpdateEmail={(newEmail) => {
          if (selectedUser) {
            updateEmailMutation.mutate({ userId: selectedUser.id, newEmail });
          }
        }}
        onResetPassword={(newPassword) => {
          if (selectedUser) {
            resetPasswordMutation.mutate({ userId: selectedUser.id, newPassword });
          }
        }}
        isPending={updateUserMutation.isPending}
        isEmailPending={updateEmailMutation.isPending}
        isPasswordPending={resetPasswordMutation.isPending}
        agencies={agencies}
        assignableRoles={capabilities.canEditRoles}
        canEditRoleAgence={true}
        onModuleToggle={handleModuleToggle}
        onModuleOptionToggle={handleModuleOptionToggle}
        canEdit={selectedUser ? canEditUser(selectedUser) : false}
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
