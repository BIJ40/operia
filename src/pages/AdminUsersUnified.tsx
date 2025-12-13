import { useState, useMemo, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserManagement, UserProfile } from '@/hooks/use-user-management';
import { GLOBAL_ROLES } from '@/types/globalRoles';
import { useAuth } from '@/contexts/AuthContext';
import { getUserManagementCapabilities } from '@/config/roleMatrix';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSessionState } from '@/hooks/useSessionState';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion } from '@/components/ui/accordion';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Users, UserPlus } from 'lucide-react';
import { UserListSkeleton } from '@/components/admin/users/UserListSkeleton';

import {
  CreateUserDialog,
  EditUserDialog,
  DeactivateDialog,
  ReactivateDialog,
  DeleteDialog,
  UserFilters,
  UserAccordionItem,
} from '@/components/admin/users';

export default function AdminUsersUnified() {
  const { isAdmin, globalRole, user: currentUser } = useAuth();
  
  const capabilities = useMemo(() => getUserManagementCapabilities(globalRole), [globalRole]);
  
  const {
    // Data
    users,
    paginatedUsers,
    filteredUsers,
    agencies,
    usersLoading,
    modifiedUsers,
    
    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    
    // Filters
    searchQuery,
    setSearchQuery,
    agencyFilter,
    setAgencyFilter,
    roleFilter,
    setRoleFilter,
    moduleFilter,
    setModuleFilter,
    showDeactivated,
    setShowDeactivated,
    
    // Permissions
    canAccessPage,
    canCreateUsers,
    assignableRoles,
    isSuperAdmin,
    effectiveUserRole,
    currentUserLevel,
    currentUserAgency,
    canEditUser,
    canDeactivateUserCheck,
    canDeleteUser,
    
    // Mutations
    saveMutation,
    createUserMutation,
    deactivateMutation,
    reactivateMutation,
    hardDeleteMutation,
    updateUserMutation,
    updateEmailMutation,
    resetPasswordMutation,
    
    // Handlers
    saveChanges,
    handleRoleChange,
    handleModuleToggle,
    handleModuleOptionToggle,
  } = useUserManagement({ scope: 'allAgencies' });

  // ✅ FIX F-EDIT-2: Récupérer les agences assignées pour le filtrage
  const { data: assignedAgenciesData } = useQuery({
    queryKey: ['user-assigned-agencies', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const { data, error } = await supabase
        .from('franchiseur_agency_assignments')
        .select('agency_id')
        .eq('user_id', currentUser.id);
      if (error) throw error;
      return data.map(a => a.agency_id);
    },
    enabled: !!currentUser?.id,
  });

  // ✅ FIX F-EDIT-2: Filtrer les agences selon manageScope
  const manageableAgencies = useMemo(() => {
    const capabilities = getUserManagementCapabilities(globalRole);
    
    // N4+: Toutes les agences
    if (capabilities.manageScope === 'allAgencies') {
      return agencies;
    }
    
    // N2: Seulement sa propre agence
    if (capabilities.manageScope === 'ownAgency' && currentUserAgency) {
      return agencies.filter(a => a.slug === currentUserAgency);
    }
    
    // N3: Agences assignées
    if (capabilities.manageScope === 'assignedAgencies') {
      const assignedAgencies = assignedAgenciesData || [];
      if (assignedAgencies.length > 0) {
        return agencies.filter(a => assignedAgencies.includes(a.id));
      }
      // Si pas d'assignation spécifique, montrer toutes (fallback pour animateurs sans restriction)
      return agencies;
    }
    
    // N0-N1: Aucune agence
    return [];
  }, [agencies, globalRole, currentUserAgency, assignedAgenciesData]);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [deactivateDialog, setDeactivateDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [reactivateDialog, setReactivateDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  
  // Accordion state avec persistance
  const [openItems, setOpenItems] = useSessionState<string[]>('admin-users-open-items', []);
  
  // Synchronisation des filtres avec sessionStorage
  const [persistedFilters, setPersistedFilters] = useSessionState<{
    searchQuery: string;
    agencyFilter: string;
    roleFilter: string;
    moduleFilter: string;
    showDeactivated: boolean;
  }>('admin-users-filters', {
    searchQuery: '',
    agencyFilter: 'all',
    roleFilter: 'all',
    moduleFilter: 'all',
    showDeactivated: false,
  });
  
  // Restaurer les filtres au montage
  useEffect(() => {
    if (persistedFilters.searchQuery) setSearchQuery(persistedFilters.searchQuery);
    if (persistedFilters.agencyFilter !== 'all') setAgencyFilter(persistedFilters.agencyFilter);
    if (persistedFilters.roleFilter !== 'all') setRoleFilter(persistedFilters.roleFilter);
    if (persistedFilters.moduleFilter !== 'all') setModuleFilter(persistedFilters.moduleFilter);
    if (persistedFilters.showDeactivated) setShowDeactivated(persistedFilters.showDeactivated);
  }, []);
  
  // Persister les filtres quand ils changent
  useEffect(() => {
    setPersistedFilters({
      searchQuery,
      agencyFilter,
      roleFilter,
      moduleFilter,
      showDeactivated,
    });
  }, [searchQuery, agencyFilter, roleFilter, moduleFilter, showDeactivated]);

  // Get effective values for a user
  const getEffectiveRole = (user: UserProfile) => modifiedUsers[user.id]?.global_role ?? user.global_role;
  const getEffectiveModules = (user: UserProfile) => modifiedUsers[user.id]?.enabled_modules ?? user.enabled_modules ?? {};

  if (!canAccessPage) {
    return <Navigate to="/" replace />;
  }

  if (usersLoading) {
    return <UserListSkeleton />;
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

        {/* Filters */}
        <UserFilters
          searchQuery={searchQuery}
          setSearchQuery={(v) => { setSearchQuery(v); setCurrentPage(0); }}
          agencyFilter={agencyFilter}
          setAgencyFilter={(v) => { setAgencyFilter(v); setCurrentPage(0); }}
          roleFilter={roleFilter}
          setRoleFilter={(v) => { setRoleFilter(v); setCurrentPage(0); }}
          moduleFilter={moduleFilter}
          setModuleFilter={(v) => { setModuleFilter(v); setCurrentPage(0); }}
          showDeactivated={showDeactivated}
          setShowDeactivated={(v) => { setShowDeactivated(v); setCurrentPage(0); }}
          agencies={manageableAgencies}
          canCreateUsers={false}
          onCreateUser={() => {}}
          totalUsers={users.length}
          filteredCount={filteredUsers.length}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
        />

        {/* Users List */}
        <Card>
          <CardContent className="p-0">
            <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="divide-y">
              {paginatedUsers.map((userItem) => (
                <UserAccordionItem
                  key={userItem.id}
                  user={userItem}
                  effectiveRole={getEffectiveRole(userItem)}
                  effectiveModules={getEffectiveModules(userItem)}
                  isModified={!!modifiedUsers[userItem.id]}
                  canEdit={canEditUser(userItem.global_role, userItem.agence, userItem.id)}
                  canDeactivate={canDeactivateUserCheck(userItem.global_role)}
                  canDelete={canDeleteUser(userItem.global_role)}
                  isSuperAdmin={isSuperAdmin}
                  assignableRoles={assignableRoles}
                  isSaving={saveMutation.isPending}
                  onSaveChanges={() => saveChanges(userItem.id)}
                  onRoleChange={(role) => handleRoleChange(userItem.id, role)}
                  onModuleToggle={(moduleKey, enabled) => handleModuleToggle(userItem.id, moduleKey, enabled)}
                  onModuleOptionToggle={(moduleKey, optionKey, enabled) => handleModuleOptionToggle(userItem.id, moduleKey, optionKey, enabled)}
                  onEditUser={() => setEditDialog({ open: true, user: userItem })}
                  onDeactivate={() => setDeactivateDialog({ open: true, user: userItem })}
                  onReactivate={() => setReactivateDialog({ open: true, user: userItem })}
                  onDelete={() => setDeleteDialog({ open: true, user: userItem })}
                />
              ))}
            </Accordion>

            {paginatedUsers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Aucun utilisateur trouvé
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <CreateUserDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSubmit={(data) => {
            createUserMutation.mutate(data, {
              onSuccess: () => setShowCreateDialog(false),
            });
          }}
          isPending={createUserMutation.isPending}
          assignableRoles={assignableRoles}
          agencies={manageableAgencies}
          currentUserLevel={currentUserLevel}
          currentUserAgency={currentUserAgency}
        />

        <EditUserDialog
          user={editDialog.user}
          open={editDialog.open}
          onOpenChange={(open) => setEditDialog({ open, user: open ? editDialog.user : null })}
          onSave={(data) => {
            if (editDialog.user) {
              updateUserMutation.mutate({ userId: editDialog.user.id, data }, {
                onSuccess: () => setEditDialog({ open: false, user: null }),
              });
            }
          }}
          onUpdateEmail={(newEmail) => {
            if (editDialog.user) {
              updateEmailMutation.mutate({ userId: editDialog.user.id, newEmail });
            }
          }}
          onResetPassword={(newPassword, sendEmail) => {
            if (editDialog.user) {
              resetPasswordMutation.mutate({ userId: editDialog.user.id, newPassword, sendEmail });
            }
          }}
          isPending={updateUserMutation.isPending}
          isEmailPending={updateEmailMutation.isPending}
          isPasswordPending={resetPasswordMutation.isPending}
          agencies={agencies}
          canEditRoleAgence={editDialog.user ? canEditUser(editDialog.user.global_role, editDialog.user.agence, editDialog.user.id) : false}
          assignableRoles={assignableRoles}
          readOnlyFields={
            // 🛡️ P1: Bloquer global_role si le rôle cible n'est pas dans canEditRoles
            editDialog.user && editDialog.user.global_role && !capabilities.canEditRoles.includes(editDialog.user.global_role)
              ? ['globalRole']
              : []
          }
          onModuleToggle={(moduleKey, enabled) => {
            if (editDialog.user) handleModuleToggle(editDialog.user.id, moduleKey, enabled);
          }}
          onModuleOptionToggle={(moduleKey, optionKey, enabled) => {
            if (editDialog.user) handleModuleOptionToggle(editDialog.user.id, moduleKey, optionKey, enabled);
          }}
          canEdit={editDialog.user ? canEditUser(editDialog.user.global_role, editDialog.user.agence, editDialog.user.id) : false}
        />

        <DeactivateDialog
          open={deactivateDialog.open}
          onOpenChange={(open) => setDeactivateDialog({ open, user: open ? deactivateDialog.user : null })}
          onConfirm={() => {
            if (deactivateDialog.user) {
              deactivateMutation.mutate(deactivateDialog.user, {
                onSuccess: () => setDeactivateDialog({ open: false, user: null }),
              });
            }
          }}
          isPending={deactivateMutation.isPending}
          user={deactivateDialog.user}
        />

        <ReactivateDialog
          open={reactivateDialog.open}
          onOpenChange={(open) => setReactivateDialog({ open, user: open ? reactivateDialog.user : null })}
          onConfirm={() => {
            if (reactivateDialog.user) {
              reactivateMutation.mutate(reactivateDialog.user, {
                onSuccess: () => setReactivateDialog({ open: false, user: null }),
              });
            }
          }}
          isPending={reactivateMutation.isPending}
          user={reactivateDialog.user}
        />

        <DeleteDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ open, user: open ? deleteDialog.user : null })}
          onConfirm={() => {
            if (deleteDialog.user) {
              hardDeleteMutation.mutate(deleteDialog.user, {
                onSuccess: () => setDeleteDialog({ open: false, user: null }),
              });
            }
          }}
          isPending={hardDeleteMutation.isPending}
          user={deleteDialog.user}
        />
      </div>
    </TooltipProvider>
  );
}
