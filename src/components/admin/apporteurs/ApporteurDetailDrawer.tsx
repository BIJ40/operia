/**
 * ApporteurDetailDrawer - Détail d'un apporteur avec gestion utilisateurs + liaison Apogée
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, UserPlus, ToggleLeft, ToggleRight, Building2, Trash2, Link2, Unlink, CheckCircle2, AlertTriangle } from 'lucide-react';
import { 
  useApporteur, 
  useApporteurUsers,
  useToggleApporteurUserStatus,
  useUpdateApporteurUserRole,
  useDeleteApporteurUser,
  useUpdateApporteurApogeeId,
} from '@/hooks/useApporteurs';
import { useValidateApogeeCommanditaire } from '@/hooks/useValidateApogeeCommanditaire';
import { ApporteurUserCreateDialog } from './ApporteurUserCreateDialog';
import { ApogeeCommanditaireSelector } from './ApogeeCommanditaireSelector';
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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedCommanditaire, setSelectedCommanditaire] = useState<{ id: number; name: string } | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: apporteur, isLoading: loadingApporteur, refetch: refetchApporteur } = useApporteur(apporteurId);
  const { data: users, isLoading: loadingUsers, refetch: refetchUsers } = useApporteurUsers(apporteurId);
  
  // Validation du commanditaire Apogée - compte les projets associés
  const { data: validationData, isLoading: validatingCommanditaire } = useValidateApogeeCommanditaire(apporteur?.apogee_client_id);
  
  const toggleUserStatus = useToggleApporteurUserStatus();
  const updateUserRole = useUpdateApporteurUserRole();
  const deleteUser = useDeleteApporteurUser();
  const updateApogeeId = useUpdateApporteurApogeeId();

  const handleToggleUserStatus = async (id: string, currentStatus: boolean) => {
    await toggleUserStatus.mutateAsync({ id, is_active: !currentStatus });
  };

  const handleRoleChange = async (id: string, role: 'reader' | 'manager') => {
    await updateUserRole.mutateAsync({ id, role });
  };

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    refetchUsers();
    onRefresh();
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    await deleteUser.mutateAsync(userToDelete.id);
    setUserToDelete(null);
    onRefresh();
  };

  const handleLinkApogee = async () => {
    if (!apporteurId || !selectedCommanditaire) return;
    await updateApogeeId.mutateAsync({
      id: apporteurId,
      apogee_client_id: selectedCommanditaire.id,
    });
    setShowLinkDialog(false);
    setSelectedCommanditaire(null);
    refetchApporteur();
    onRefresh();
  };

  const handleUnlinkApogee = async () => {
    if (!apporteurId) return;
    await updateApogeeId.mutateAsync({
      id: apporteurId,
      apogee_client_id: null,
    });
    refetchApporteur();
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
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Créé le</span>
                    <span>{format(new Date(apporteur.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Liaison Apogée */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Liaison Apogée
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {apporteur.apogee_client_id ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div>
                          <p className="font-medium text-green-700 dark:text-green-300">Raccordé à Apogée</p>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            ID Commanditaire : <strong>{apporteur.apogee_client_id}</strong>
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleUnlinkApogee}
                          disabled={updateApogeeId.isPending}
                          className="text-destructive hover:text-destructive"
                        >
                          {updateApogeeId.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Unlink className="h-4 w-4 mr-1" />
                          )}
                          Délier
                        </Button>
                      </div>
                      
                      {/* Preuve de liaison - compteur de projets */}
                      <div className="p-3 rounded-lg border">
                        {validatingCommanditaire ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Vérification des dossiers...</span>
                          </div>
                        ) : validationData && validationData.projects_count > 0 ? (
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="text-sm font-medium">
                              {validationData.projects_count} dossier{validationData.projects_count > 1 ? 's' : ''} détecté{validationData.projects_count > 1 ? 's' : ''} dans Apogée
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-5 w-5" />
                            <span className="text-sm">
                              0 dossier trouvé — vérifier l'ID ou l'agence
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLinkDialog(true)}
                        className="w-full"
                      >
                        Changer le commanditaire
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-amber-700 dark:text-amber-300 text-sm">
                          ⚠️ Non raccordé à Apogée. Les statistiques ne seront pas disponibles pour cet apporteur.
                        </p>
                      </div>
                      <Button
                        onClick={() => setShowLinkDialog(true)}
                        className="w-full"
                      >
                        <Link2 className="h-4 w-4 mr-2" />
                        Lier à un commanditaire Apogée
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Utilisateurs */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Utilisateurs</CardTitle>
                  <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Créer
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

      {/* Create User Dialog */}
      {apporteurId && (
        <ApporteurUserCreateDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          apporteurId={apporteurId}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Link Apogée Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Lier à un commanditaire Apogée</DialogTitle>
            <DialogDescription>
              Recherchez et sélectionnez le commanditaire correspondant dans Apogée pour activer les statistiques.
            </DialogDescription>
          </DialogHeader>
          
          <ApogeeCommanditaireSelector
            currentId={apporteur?.apogee_client_id}
            onSelect={setSelectedCommanditaire}
          />

          {selectedCommanditaire && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium">Sélectionné :</p>
              <p className="text-sm text-muted-foreground">
                {selectedCommanditaire.name} (ID: {selectedCommanditaire.id})
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleLinkApogee}
              disabled={!selectedCommanditaire || updateApogeeId.isPending}
            >
              {updateApogeeId.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Lier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
