import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserManagement, UserProfile } from '@/hooks/use-user-management';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { getUserManagementCapabilities } from '@/config/roleMatrix';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Users, UserPlus } from 'lucide-react';
import { UserListSkeleton } from '@/components/admin/users/UserListSkeleton';
import { AdminViewHeader } from '@/components/admin/shared/AdminViewHeader';

import {
  CreateUserDialog,
  EditUserDialog,
  DeactivateDialog,
  ReactivateDialog,
  DeleteDialog,
  UserFilters,
  UserRowItem,
} from '@/components/admin/users';

export default function TDRUsersPage() {
  const { globalRole } = usePermissionsBridge();
  const { user: currentUser } = useAuthCore();
  
  const capabilities = useMemo(() => getUserManagementCapabilities(globalRole), [globalRole]);
  
  // Déterminer le scope selon le rôle
  // N4+ → allAgencies, N3 → assignedAgencies, N2 → ownAgency
  const scope = useMemo(() => {
    if (capabilities.viewScope === 'allAgencies') return 'allAgencies';
    return 'ownAgency';
  }, [capabilities.viewScope]);
  
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
  } = useUserManagement({ scope });

  const manageableAgencies = useMemo(() => {
    if (scope === 'allAgencies') {
      return agencies;
    }
    
    if (scope === 'ownAgency' && currentUserAgency) {
      return agencies.filter(a => a.slug === currentUserAgency);
    }
    
    return [];
  }, [agencies, scope, currentUserAgency]);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [deactivateDialog, setDeactivateDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [reactivateDialog, setReactivateDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });

  // Get effective values for a user
  const getEffectiveRole = (user: UserProfile) => modifiedUsers[user.id]?.global_role ?? user.global_role;
  const getEffectiveModules = (user: UserProfile) => modifiedUsers[user.id]?.enabled_modules ?? user.enabled_modules ?? {};

  if (!canAccessPage) {
    return <Navigate to="/" replace />;
  }

  if (usersLoading) {
    return (
      <div className="space-y-6">
        <UserListSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <AdminViewHeader
            title="Gestion Utilisateurs Réseau"
            subtitle="Gestion des utilisateurs et permissions du réseau"
          >
            <Badge variant="outline" className="text-xs">
              {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
            </Badge>
            {canCreateUsers && (
              <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                <UserPlus className="w-4 h-4 mr-1.5" />
                Nouvel utilisateur
              </Button>
            )}
          </AdminViewHeader>

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
          <CardContent className="p-0 divide-y">
            {paginatedUsers.map((userItem) => (
              <UserRowItem
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
            editDialog.user && editDialog.user.global_role && !capabilities.canEditRoles.includes(editDialog.user.global_role)
              ? ['globalRole']
              : []
          }
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
    </div>
  );
}
