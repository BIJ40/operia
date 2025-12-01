import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RichTextEditor } from '@/components/RichTextEditor';
import { 
  useAnnouncementsAdmin, 
  useAnnouncementStats,
  PriorityAnnouncement 
} from '@/hooks/use-priority-announcements';
import { GLOBAL_ROLES, GLOBAL_ROLE_LABELS, GlobalRole } from '@/types/globalRoles';
import { format, isPast, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Plus, 
  Edit, 
  Trash2, 
  BarChart3, 
  Megaphone,
  Check,
  Clock,
  XCircle,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react';

const ROLE_AGENCE_OPTIONS = [
  { value: 'dirigeant', label: 'Dirigeant' },
  { value: 'assistante', label: 'Assistante' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'tete_de_reseau', label: 'Tête de réseau' },
  { value: 'externe', label: 'Externe' },
];

const GLOBAL_ROLE_OPTIONS: { value: GlobalRole; label: string }[] = [
  { value: 'franchisee_user', label: GLOBAL_ROLE_LABELS.franchisee_user },
  { value: 'franchisee_admin', label: GLOBAL_ROLE_LABELS.franchisee_admin },
  { value: 'franchisor_user', label: GLOBAL_ROLE_LABELS.franchisor_user },
  { value: 'franchisor_admin', label: GLOBAL_ROLE_LABELS.franchisor_admin },
  { value: 'platform_admin', label: GLOBAL_ROLE_LABELS.platform_admin },
];

interface AnnouncementFormData {
  title: string;
  content: string;
  image_path: string | null;
  is_active: boolean;
  expires_at: string;
  target_all: boolean;
  target_global_roles: string[];
  target_role_agences: string[];
  exclude_base_users: boolean;
}

const defaultFormData: AnnouncementFormData = {
  title: '',
  content: '',
  image_path: null,
  is_active: true,
  expires_at: '',
  target_all: false,
  target_global_roles: [],
  target_role_agences: [],
  exclude_base_users: true,
};

export default function AdminAnnouncementsPage() {
  const { 
    announcements, 
    isLoading, 
    createAnnouncement, 
    updateAnnouncement,
    deleteAnnouncement,
    isCreating,
    isUpdating,
  } = useAnnouncementsAdmin();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AnnouncementFormData>(defaultFormData);
  const [statsAnnouncementId, setStatsAnnouncementId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: statsData, isLoading: statsLoading } = useAnnouncementStats(statsAnnouncementId);

  const handleCreate = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const handleEdit = (announcement: PriorityAnnouncement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      image_path: announcement.image_path,
      is_active: announcement.is_active,
      expires_at: announcement.expires_at ? format(parseISO(announcement.expires_at), "yyyy-MM-dd'T'HH:mm") : '',
      target_all: announcement.target_all,
      target_global_roles: announcement.target_global_roles || [],
      target_role_agences: announcement.target_role_agences || [],
      exclude_base_users: announcement.exclude_base_users,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      ...formData,
      expires_at: new Date(formData.expires_at).toISOString(),
    };

    if (editingId) {
      updateAnnouncement({ id: editingId, ...payload });
    } else {
      createAnnouncement(payload);
    }
    setDialogOpen(false);
  };

  const handleToggleRole = (role: string, type: 'global' | 'agence') => {
    const key = type === 'global' ? 'target_global_roles' : 'target_role_agences';
    const current = formData[key];
    setFormData({
      ...formData,
      [key]: current.includes(role)
        ? current.filter(r => r !== role)
        : [...current, role],
    });
  };

  const getStatusBadge = (announcement: PriorityAnnouncement) => {
    const isExpired = isPast(parseISO(announcement.expires_at));
    if (!announcement.is_active) {
      return <Badge variant="secondary"><EyeOff className="h-3 w-3 mr-1" />Inactive</Badge>;
    }
    if (isExpired) {
      return <Badge variant="destructive">Expirée</Badge>;
    }
    return <Badge className="bg-green-500"><Eye className="h-3 w-3 mr-1" />Active</Badge>;
  };

  const getTargetingLabel = (announcement: PriorityAnnouncement) => {
    if (announcement.target_all) return 'Tous les utilisateurs';
    const parts: string[] = [];
    if (announcement.target_global_roles?.length) {
      parts.push(`${announcement.target_global_roles.length} rôle(s)`);
    }
    if (announcement.target_role_agences?.length) {
      parts.push(`${announcement.target_role_agences.length} poste(s)`);
    }
    return parts.length ? parts.join(', ') : 'Aucun ciblage';
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Annonces Prioritaires</h1>
            <p className="text-muted-foreground">
              Diffusez des informations importantes à vos utilisateurs
            </p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle annonce
        </Button>
      </div>

      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Liste des annonces ({announcements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune annonce créée. Cliquez sur "Nouvelle annonce" pour commencer.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Ciblage</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Créée le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {announcement.title}
                    </TableCell>
                    <TableCell>{getStatusBadge(announcement)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getTargetingLabel(announcement)}
                      {announcement.exclude_base_users && (
                        <span className="block text-xs">N0 exclus</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(announcement.expires_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(announcement.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStatsAnnouncementId(announcement.id)}
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(announcement)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(announcement.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog création/édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Titre */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titre de l'annonce"
              />
            </div>

            {/* Contenu riche */}
            <div className="space-y-2">
              <Label>Contenu *</Label>
              <RichTextEditor
                content={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
              />
            </div>

            {/* URL Image (simplifié) */}
            <div className="space-y-2">
              <Label htmlFor="image">URL de l'image (optionnel)</Label>
              <Input
                id="image"
                value={formData.image_path || ''}
                onChange={(e) => setFormData({ ...formData, image_path: e.target.value || null })}
                placeholder="Chemin ou URL de l'image"
              />
            </div>

            {/* Date d'expiration */}
            <div className="space-y-2">
              <Label htmlFor="expires">Date d'expiration *</Label>
              <Input
                id="expires"
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>

            {/* Ciblage */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Ciblage</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.target_all}
                    onCheckedChange={(checked) => setFormData({ ...formData, target_all: checked })}
                  />
                  <span className="text-sm">Tous les utilisateurs</span>
                </div>
              </div>

              {!formData.target_all && (
                <>
                  {/* Rôles globaux */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Par niveau (global_role)</Label>
                    <div className="flex flex-wrap gap-2">
                      {GLOBAL_ROLE_OPTIONS.map((role) => (
                        <label
                          key={role.value}
                          className="flex items-center gap-2 px-3 py-1.5 border rounded-md cursor-pointer hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={formData.target_global_roles.includes(role.value)}
                            onCheckedChange={() => handleToggleRole(role.value, 'global')}
                          />
                          <span className="text-sm">{role.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Postes agence */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Par poste (role_agence)</Label>
                    <div className="flex flex-wrap gap-2">
                      {ROLE_AGENCE_OPTIONS.map((role) => (
                        <label
                          key={role.value}
                          className="flex items-center gap-2 px-3 py-1.5 border rounded-md cursor-pointer hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={formData.target_role_agences.includes(role.value)}
                            onCheckedChange={() => handleToggleRole(role.value, 'agence')}
                          />
                          <span className="text-sm">{role.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Exclusion N0 */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Checkbox
                  id="exclude-n0"
                  checked={formData.exclude_base_users}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, exclude_base_users: checked as boolean })
                  }
                />
                <Label htmlFor="exclude-n0" className="text-sm cursor-pointer">
                  Exclure les utilisateurs N0 (base_user)
                </Label>
              </div>
            </div>

            {/* Actif/Inactif */}
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Annonce active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.title || !formData.content || !formData.expires_at || isCreating || isUpdating}
            >
              {editingId ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet statistiques */}
      <Sheet open={!!statsAnnouncementId} onOpenChange={() => setStatsAnnouncementId(null)}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Statistiques de lecture</SheetTitle>
          </SheetHeader>

          {statsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : statsData ? (
            <div className="mt-6 space-y-6">
              {/* Résumé */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{statsData.stats.read}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Check className="h-3 w-3" /> Lu
                  </div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{statsData.stats.later}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" /> Reporté
                  </div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-gray-600">{statsData.stats.unread}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <XCircle className="h-3 w-3" /> Non lu
                  </div>
                </Card>
              </div>

              {/* Liste des utilisateurs */}
              <div>
                <h4 className="font-medium mb-2">Détail par utilisateur ({statsData.stats.total})</h4>
                <ScrollArea className="h-[400px] border rounded-md">
                  <div className="p-2 space-y-1">
                    {statsData.users.map((user) => (
                      <div
                        key={user.user_id}
                        className="flex items-center justify-between p-2 rounded hover:bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {user.status === 'read' && (
                            <Badge className="bg-green-500">
                              <Check className="h-3 w-3 mr-1" />Lu
                            </Badge>
                          )}
                          {user.status === 'later' && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              <Clock className="h-3 w-3 mr-1" />Reporté
                            </Badge>
                          )}
                          {user.status === 'unread' && (
                            <Badge variant="outline">Non lu</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Dialog confirmation suppression */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  deleteAnnouncement(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
