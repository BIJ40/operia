import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Building2, Users, ExternalLink, Check, X, Info, Link2, Link2Off, Archive, Trash2, Plus, Mail, UserPlus, Globe } from 'lucide-react';
import { Apporteur, useToggleApporteurStatus, useApporteurManagers, useCreateApporteurManager, useToggleApporteurManagerStatus, useUpdateApporteurApogeeId, useDeleteApporteur, useTogglePortalEnabled } from '@/hooks/useApporteurs';
import { Switch } from '@/components/ui/switch';
import { ApporteurContactsSection } from './ApporteurContactsSection';
import { ApogeeCommanditaireSelector } from '@/components/shared/apporteurs/ApogeeCommanditaireSelector';
import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePermissions } from '@/contexts/PermissionsContext';

interface ApporteurDetailSheetProps {
  apporteur: Apporteur | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApporteurDetailSheet({ apporteur, open, onOpenChange }: ApporteurDetailSheetProps) {
  const { hasGlobalRole } = usePermissions();
  const toggleStatus = useToggleApporteurStatus();
  const togglePortal = useTogglePortalEnabled();
  const deleteApporteur = useDeleteApporteur();
  const { data: managers } = useApporteurManagers(apporteur?.id || null);
  const createManager = useCreateApporteurManager();
  const toggleManagerStatus = useToggleApporteurManagerStatus();
  const updateApogeeId = useUpdateApporteurApogeeId();
  const [showLinkSelector, setShowLinkSelector] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', first_name: '', last_name: '', role: 'reader' as 'reader' | 'manager' });

  const isAdmin = hasGlobalRole('platform_admin'); // N5+
  const canArchive = hasGlobalRole('franchisee_admin'); // N2+
  const canManageUsers = hasGlobalRole('franchisee_admin'); // N2+

  if (!apporteur) return null;

  const handleToggleStatus = () => {
    toggleStatus.mutate({ id: apporteur.id, is_active: !apporteur.is_active });
  };

  const handleDelete = () => {
    deleteApporteur.mutate(apporteur.id, { onSuccess: () => onOpenChange(false) });
  };

  const handleLinkApogee = (commanditaire: { id: number; name: string }) => {
    updateApogeeId.mutate({ id: apporteur.id, apogee_client_id: commanditaire.id });
    setShowLinkSelector(false);
  };

  const handleUnlinkApogee = () => {
    updateApogeeId.mutate({ id: apporteur.id, apogee_client_id: null });
  };

  const handleCreateUser = () => {
    if (!newUser.email || !newUser.first_name || !newUser.last_name) return;
    createManager.mutate({
      apporteur_id: apporteur.id,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      role: newUser.role,
    }, {
      onSuccess: () => {
        setShowAddUser(false);
        setNewUser({ email: '', first_name: '', last_name: '', role: 'reader' });
      },
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
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Portail activé</span>
                </div>
                <Switch
                  checked={apporteur.portal_enabled}
                  onCheckedChange={(checked) => togglePortal.mutate({ id: apporteur.id, portal_enabled: checked })}
                  disabled={togglePortal.isPending}
                />
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
                  <Button variant="outline" size="sm" className="w-full" onClick={handleUnlinkApogee} disabled={updateApogeeId.isPending}>
                    <Link2Off className="h-4 w-4 mr-2" />
                    Délier
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Non lié à un commanditaire Apogée</p>
                  {showLinkSelector ? (
                    <div className="space-y-2">
                      <ApogeeCommanditaireSelector onSelect={(cmd) => handleLinkApogee(cmd)} />
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowLinkSelector(false)}>
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setShowLinkSelector(true)}>
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

          {/* Gestionnaires (système OTP) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Utilisateurs ({managers?.length || 0})
                </CardTitle>
                {canManageUsers && !showAddUser && (
                  <Button variant="outline" size="sm" onClick={() => setShowAddUser(true)}>
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Formulaire d'ajout */}
              {showAddUser && (
                <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <UserPlus className="h-4 w-4" />
                    Nouvel utilisateur
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Prénom</Label>
                      <Input
                        placeholder="Prénom"
                        value={newUser.first_name}
                        onChange={(e) => setNewUser(prev => ({ ...prev, first_name: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Nom</Label>
                      <Input
                        placeholder="Nom"
                        value={newUser.last_name}
                        onChange={(e) => setNewUser(prev => ({ ...prev, last_name: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      placeholder="email@exemple.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Rôle</Label>
                    <Select value={newUser.role} onValueChange={(v) => setNewUser(prev => ({ ...prev, role: v as 'reader' | 'manager' }))}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reader">Lecteur (consultation)</SelectItem>
                        <SelectItem value="manager">Gestionnaire (consultation + demandes)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleCreateUser}
                      disabled={createManager.isPending || !newUser.email || !newUser.first_name || !newUser.last_name}
                    >
                      {createManager.isPending ? 'Création...' : 'Créer'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowAddUser(false)}>
                      Annuler
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Connexion par code email (sans mot de passe)
                  </p>
                </div>
              )}

              {/* Liste des gestionnaires */}
              {managers && managers.length > 0 ? (
                <div className="space-y-2">
                  {managers.map((mgr) => (
                    <div
                      key={mgr.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {mgr.first_name} {mgr.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{mgr.email}</p>
                        {mgr.last_login_at && (
                          <p className="text-xs text-muted-foreground">
                            Dernière connexion : {format(new Date(mgr.last_login_at), 'dd/MM/yyyy', { locale: fr })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {mgr.role === 'manager' ? 'Gestionnaire' : 'Lecteur'}
                        </Badge>
                        {canManageUsers && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleManagerStatus.mutate({ id: mgr.id, is_active: !mgr.is_active })}
                          >
                            {mgr.is_active ? (
                              <div className="w-2 h-2 rounded-full bg-green-500" title="Actif - cliquer pour désactiver" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-red-500" title="Inactif - cliquer pour réactiver" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : !showAddUser ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun utilisateur
                </p>
              ) : null}

              <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Les utilisateurs se connectent via un code envoyé par email (pas de mot de passe). La session reste active 1 an.
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
                  <Button variant="outline" size="sm" className="w-full" onClick={handleToggleStatus} disabled={toggleStatus.isPending}>
                    <Archive className="h-4 w-4 mr-2" />
                    {apporteur.is_active ? 'Archiver' : 'Réactiver'}
                  </Button>
                )}
                
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="w-full" disabled={deleteApporteur.isPending}>
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
