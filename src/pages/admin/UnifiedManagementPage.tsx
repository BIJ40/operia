/**
 * Gestion des Permissions - Page centrale de gestion des accès
 * Gère les utilisateurs, leurs rôles et accès
 */


import { useAccessRightsUsers, UserRow } from '@/hooks/access-rights';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Users, UserPlus, MoreHorizontal, Pencil, UserX, UserCheck, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { CreateUserDialog, EditUserDialog, DeactivateDialog, ReactivateDialog, DeleteDialog } from '@/components/admin/users';
import { UserProfile } from '@/hooks/use-user-management';

// Mapping simplifié des labels de rôles (N1 legacy conservé pour affichage utilisateurs existants)
const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Administrateur',
  platform_admin: 'Support avancé',
  franchisor_admin: 'Direction réseau',
  franchisor_user: 'Animateur réseau',
  franchisee_admin: 'Dirigeant agence',
  franchisee_user: 'Utilisateur agence',
  base_user: 'Partenaire externe',
};

// Mapping simplifié des couleurs
const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-red-500 text-white',
  platform_admin: 'bg-purple-500 text-white',
  franchisor_admin: 'bg-indigo-500 text-white',
  franchisor_user: 'bg-blue-500 text-white',
  franchisee_admin: 'bg-green-500 text-white',
  franchisee_user: 'bg-teal-500 text-white',
  base_user: 'bg-gray-400 text-white',
};

// Adapter UserRow → UserProfile pour les dialogs
function userRowToProfile(user: UserRow): UserProfile {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    agence: user.agence,
    agency_id: user.agency_id,
    global_role: user.global_role,
    enabled_modules: user.enabled_modules,
    role_agence: user.role_agence,
    created_at: user.created_at,
    is_active: user.is_active,
    deactivated_at: user.deactivated_at,
    deactivated_by: user.deactivated_by,
    must_change_password: user.must_change_password,
    apogee_user_id: user.apogee_user_id,
    agencyLabel: user.agency?.label ?? null,
  };
}

export default function UnifiedManagementPage() {
  const {
    users,
    agencies,
    isLoading,
    capabilities,
    currentUserLevel,
    currentUserAgency,
    selectedUser,
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
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
    openEditDialog,
    openDeactivateDialog,
    openReactivateDialog,
    openDeleteDialog,
    canEditUser,
  } = useAccessRightsUsers();
  
  const [search, setSearch] = useState('');

  const canCreateUsers = capabilities.canCreateRoles.length > 0;
  const isSuperAdmin = currentUserLevel >= 6;

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!search) return users;
    const lower = search.toLowerCase();
    return users.filter(u => 
      u.email?.toLowerCase().includes(lower) ||
      u.first_name?.toLowerCase().includes(lower) ||
      u.last_name?.toLowerCase().includes(lower) ||
      u.agency?.label?.toLowerCase().includes(lower) ||
      u.agence?.toLowerCase().includes(lower)
    );
  }, [users, search]);

  const getDisplayName = (user: UserRow) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return 'Sans nom';
  };

  const getAgencyLabel = (user: UserRow) => {
    return user.agency?.label || user.agence || null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestion des Permissions</h1>
        <p className="text-muted-foreground">Utilisateurs, rôles et accès</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Utilisateurs
              </CardTitle>
              <CardDescription>
                Liste des utilisateurs et leurs rôles
              </CardDescription>
            </div>
            
            {canCreateUsers && (
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Nouvel utilisateur
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un utilisateur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Agence</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Aucun utilisateur trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const canEdit = canEditUser(user);
                    const isDeactivated = user.is_active === false;
                    const agencyLabel = getAgencyLabel(user);
                    
                    return (
                      <TableRow key={user.id} className={isDeactivated ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="font-medium">
                            {getDisplayName(user)}
                            {isDeactivated && (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                Désactivé
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={ROLE_COLORS[user.global_role || ''] || 'bg-gray-400 text-white'}>
                            {ROLE_LABELS[user.global_role || ''] || user.global_role || 'Non défini'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {agencyLabel ? (
                            <span className="text-sm font-medium">{agencyLabel}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {canEdit && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-background">
                                <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {!isDeactivated ? (
                                  <DropdownMenuItem 
                                    onClick={() => openDeactivateDialog(user)}
                                    className="text-orange-600"
                                  >
                                    <UserX className="h-4 w-4 mr-2" />
                                    Désactiver
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    onClick={() => openReactivateDialog(user)}
                                    className="text-green-600"
                                  >
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Réactiver
                                  </DropdownMenuItem>
                                )}
                                {isSuperAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => openDeleteDialog(user)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-xs text-muted-foreground">
            {filteredUsers.length} utilisateur(s)
          </div>
        </CardContent>
      </Card>

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
        user={selectedUser ? userRowToProfile(selectedUser) : null}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
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
        canEditRoleAgence={currentUserLevel >= 2}
      />

      <DeactivateDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        onConfirm={() => {
          if (selectedUser) {
            deactivateMutation.mutate(selectedUser);
          }
        }}
        isPending={deactivateMutation.isPending}
        user={selectedUser ? userRowToProfile(selectedUser) : null}
      />

      <ReactivateDialog
        open={reactivateDialogOpen}
        onOpenChange={setReactivateDialogOpen}
        onConfirm={() => {
          if (selectedUser) {
            reactivateMutation.mutate(selectedUser);
          }
        }}
        isPending={reactivateMutation.isPending}
        user={selectedUser ? userRowToProfile(selectedUser) : null}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          if (selectedUser) {
            hardDeleteMutation.mutate(selectedUser);
          }
        }}
        isPending={hardDeleteMutation.isPending}
        user={selectedUser ? userRowToProfile(selectedUser) : null}
      />
    </div>
  );
}
