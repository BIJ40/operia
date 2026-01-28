import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Building2, Users, ExternalLink, Check, X, Info, Link2, Link2Off, Archive, Trash2 } from 'lucide-react';
import { Apporteur, useToggleApporteurStatus, useApporteurUsers, useUpdateApporteurApogeeId, useDeleteApporteur } from '@/hooks/useApporteurs';
import { ApporteurContactsSection } from './ApporteurContactsSection';
import { ApogeeCommanditaireSelector } from '@/components/shared/apporteurs/ApogeeCommanditaireSelector';
import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface ApporteurDetailSheetProps {
  apporteur: Apporteur | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApporteurDetailSheet({ apporteur, open, onOpenChange }: ApporteurDetailSheetProps) {
  const { hasGlobalRole } = useAuth();
  const toggleStatus = useToggleApporteurStatus();
  const deleteApporteur = useDeleteApporteur();
  const { data: users } = useApporteurUsers(apporteur?.id || null);
  const updateApogeeId = useUpdateApporteurApogeeId();
  const [showLinkSelector, setShowLinkSelector] = useState(false);

  const isAdmin = hasGlobalRole('platform_admin'); // N5+ peut supprimer
  const canArchive = hasGlobalRole('franchisee_admin'); // N2+ peut archiver

  if (!apporteur) return null;

  const handleToggleStatus = () => {
    toggleStatus.mutate({
      id: apporteur.id,
      is_active: !apporteur.is_active,
    });
  };

  const handleDelete = () => {
    deleteApporteur.mutate(apporteur.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const handleLinkApogee = (commanditaire: { id: number; name: string }) => {
    updateApogeeId.mutate({
      id: apporteur.id,
      apogee_client_id: commanditaire.id,
    });
    setShowLinkSelector(false);
  };

  const handleUnlinkApogee = () => {
    updateApogeeId.mutate({
      id: apporteur.id,
      apogee_client_id: null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {apporteur.name}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Organisation Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Organisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant="outline">{apporteur.type}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Créé le</span>
                <span className="text-sm">
                  {format(new Date(apporteur.created_at), 'dd MMM yyyy', { locale: fr })}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Statut</span>
                <div className="flex items-center gap-2">
                  {apporteur.is_active ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <Check className="h-3 w-3 mr-1" />
                      Actif
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20">
                      <X className="h-3 w-3 mr-1" />
                      Archivé
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liaison Apogée */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Liaison Apogée
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {apporteur.apogee_client_id ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">ID Commanditaire</span>
                    <Badge variant="secondary">{apporteur.apogee_client_id}</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleUnlinkApogee}
                    disabled={updateApogeeId.isPending}
                  >
                    <Link2Off className="h-4 w-4 mr-2" />
                    Délier
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Non lié à un commanditaire Apogée
                  </p>
                  {showLinkSelector ? (
                    <div className="space-y-2">
                      <ApogeeCommanditaireSelector
                        onSelect={(cmd) => { handleLinkApogee(cmd); }}
                      />
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowLinkSelector(false)}>
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowLinkSelector(true)}
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Lier à Apogée
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Contacts */}
          <ApporteurContactsSection apporteurId={apporteur.id} agencyId={apporteur.agency_id} />

          {/* Users (lecture seule) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Utilisateurs ({users?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {users && users.length > 0 ? (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                        {user.is_active ? (
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun utilisateur
                </p>
              )}
              
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Pour gérer les utilisateurs (ajouter, modifier les accès), contactez l'administrateur.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {(canArchive || isAdmin) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-destructive">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {canArchive && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleToggleStatus}
                    disabled={toggleStatus.isPending}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    {apporteur.is_active ? 'Archiver' : 'Réactiver'}
                  </Button>
                )}
                
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        disabled={deleteApporteur.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer définitivement
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cet apporteur ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Tous les utilisateurs, contacts et liens projets associés à "{apporteur.name}" seront également supprimés.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
