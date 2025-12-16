/**
 * ApporteurDetailDrawer - Détail d'un apporteur avec gestion utilisateurs
 */

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus, ToggleLeft, ToggleRight, RefreshCw, Building2, Trash2 } from 'lucide-react';
import { 
  useApporteur, 
  useApporteurUsers,
  useToggleApporteurUserStatus,
  useUpdateApporteurUserRole,
  useInviteApporteurUser,
  useDeleteApporteurUser,
} from '@/hooks/useApporteurs';
import { ApporteurInviteDialog } from './ApporteurInviteDialog';
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_LABELS: Record<string, string> = {
  agence_immo: 'Agence Immobilière',
  syndic: 'Syndic',
  assurance: 'Assurance',
  courtier: 'Courtier',
};

const ROLE_LABELS: Record<string, string> = {
  reader: 'Lecteur',
  manager: 'Gestionnaire',
};

interface ApporteurDetailDrawerProps {
  apporteurId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export function ApporteurDetailDrawer({
  apporteurId,
  onClose,
  onRefresh,
}: ApporteurDetailDrawerProps) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: apporteur, isLoading: loadingApporteur } = useApporteur(apporteurId);
  const { data: users, isLoading: loadingUsers, refetch: refetchUsers } = useApporteurUsers(apporteurId);
  
  const toggleUserStatus = useToggleApporteurUserStatus();
  const updateUserRole = useUpdateApporteurUserRole();
  const inviteUser = useInviteApporteurUser();
  const deleteUser = useDeleteApporteurUser();

  const handleToggleUserStatus = async (id: string, currentStatus: boolean) => {
    await toggleUserStatus.mutateAsync({ id, is_active: !currentStatus });
  };

  const handleRoleChange = async (id: string, role: 'reader' | 'manager') => {
    await updateUserRole.mutateAsync({ id, role });
  };

  const handleResendInvite = async (user: typeof users[0]) => {
    if (!apporteurId) return;
    await inviteUser.mutateAsync({
      apporteur_id: apporteurId,
      email: user.email!,
      first_name: user.first_name || undefined,
      last_name: user.last_name || undefined,
      role: user.role,
    });
  };

  const handleInviteSuccess = () => {
    setShowInviteDialog(false);
    refetchUsers();
    onRefresh();
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    await deleteUser.mutateAsync(userToDelete.id);
    setUserToDelete(null);
    onRefresh();
  };

  return (
    <>
      <Sheet open={!!apporteurId} onOpenChange={() => onClose()}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Détail Apporteur
            </SheetTitle>
          </SheetHeader>

          {loadingApporteur ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : apporteur ? (
            <div className="space-y-6 mt-6">
              {/* Info Organisation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{apporteur.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="outline">
                      {TYPE_LABELS[apporteur.type] || apporteur.type}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Statut</span>
                    <Badge variant={apporteur.is_active ? "default" : "secondary"}>
                      {apporteur.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  {apporteur.apogee_client_id && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID Apogée</span>
                      <span>{apporteur.apogee_client_id}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Créé le</span>
                    <span>{format(new Date(apporteur.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Utilisateurs */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Utilisateurs</CardTitle>
                  <Button size="sm" onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Inviter
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingUsers ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !users || users.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Aucun utilisateur
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Rôle</TableHead>
                          <TableHead className="text-center">Actif</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              {user.first_name || user.last_name
                                ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                : '-'}
                            </TableCell>
                            <TableCell className="text-sm">{user.email || '-'}</TableCell>
                            <TableCell>
                              <Select
                                value={user.role}
                                onValueChange={(value) => handleRoleChange(user.id, value as 'reader' | 'manager')}
                              >
                                <SelectTrigger className="w-28 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="reader">Lecteur</SelectItem>
                                  <SelectItem value="manager">Gestionnaire</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={user.is_active ? "default" : "secondary"} className="text-xs">
                                {user.is_active ? 'Oui' : 'Non'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                                disabled={toggleUserStatus.isPending}
                                title={user.is_active ? 'Désactiver' : 'Activer'}
                              >
                                {user.is_active ? (
                                  <ToggleRight className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleResendInvite(user)}
                                disabled={inviteUser.isPending || !user.email}
                                title="Renvoyer invitation"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setUserToDelete({
                                  id: user.id,
                                  name: user.first_name || user.email || 'cet utilisateur'
                                })}
                                disabled={deleteUser.isPending}
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Apporteur non trouvé
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Invite Dialog */}
      {apporteurId && (
        <ApporteurInviteDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          apporteurId={apporteurId}
          onSuccess={handleInviteSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'utilisateur "{userToDelete?.name}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
