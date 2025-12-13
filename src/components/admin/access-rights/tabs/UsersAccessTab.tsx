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
import { Search, Users, UserPlus, MoreHorizontal, Pencil, UserX, UserCheck, Trash2 } from 'lucide-react';
import { GLOBAL_ROLE_LABELS, GLOBAL_ROLE_COLORS, type GlobalRole } from '@/types/globalRoles';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllAgencySubscriptions } from '@/hooks/access-rights/useAgencySubscription';
import { useAccessRightsUsers, UserRow } from '@/hooks/access-rights/useAccessRightsUsers';
import { CreateUserDialog, EditUserDialog, DeactivateDialog, ReactivateDialog, DeleteDialog } from '@/components/admin/users/UserDialogs';
import { ModuleKey, EnabledModules } from '@/types/modules';

export function UsersAccessTab() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  
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
  
  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
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
  }, [users, search, roleFilter, statusFilter]);

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
      const isEnabled = typeof currentModule === 'object' ? currentModule?.enabled ?? false : !!currentModule;
      const currentOptions = typeof currentModule === 'object' ? currentModule?.options || {} : {};
      return {
        ...prev,
        [moduleKey]: {
          enabled: isEnabled,
          options: {
            ...currentOptions,
            [optionKey]: enabled
          }
        }
      };
    });
  };

  // Save modules when closing edit dialog
  const handleCloseEditDialog = (open: boolean) => {
    if (!open && selectedUser && localModules) {
      // Check if modules changed
      const modulesChanged = JSON.stringify(localModules) !== JSON.stringify(selectedUser.enabled_modules);
      if (modulesChanged) {
        saveModulesMutation.mutate({ userId: selectedUser.id, enabledModules: localModules });
      }
    }
    setEditDialogOpen(open);
    if (!open) {
      setLocalModules(null);
    }
  };

  // Convert UserRow to UserProfile format for dialogs
  const userAsProfile = selectedUser ? {
    ...selectedUser,
    global_role: selectedUser.global_role,
    enabled_modules: localModules ?? selectedUser.enabled_modules,
  } : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Utilisateurs et Accès
            </CardTitle>
            <CardDescription>
              Gérez les utilisateurs, leurs rôles et leurs accès modules
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Agence</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const agencyPlan = user.agency_id ? agencyPlanMap.get(user.agency_id) : undefined;
                  const canEdit = canEditUser(user);
                  
                  return (
                    <TableRow key={user.id} className={!user.is_active ? 'opacity-60' : ''}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                          {user.role_agence && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {user.role_agence}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.global_role)}>
                          {GLOBAL_ROLE_LABELS[user.global_role as keyof typeof GLOBAL_ROLE_LABELS] || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(['franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'] as const).includes(user.global_role as any) ? (
                          <span className="font-medium text-primary">SIÈGE</span>
                        ) : user.agency?.label ? (
                          user.agency.label
                        ) : (
                          <span className="text-muted-foreground italic">Sans agence</span>
                        )}
                      </TableCell>
                      <TableCell>
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
        onSave={(data) => {
          if (selectedUser) {
            updateUserMutation.mutate({ userId: selectedUser.id, data });
          }
        }}
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
