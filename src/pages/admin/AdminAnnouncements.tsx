import { useState } from 'react';
import { useAllAnnouncements, useDeleteAnnouncement, useAnnouncementStats, type AnnouncementWithDetails } from '@/hooks/use-announcements';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, Calendar } from 'lucide-react';
import { AnnouncementForm } from '@/components/admin/announcements/AnnouncementForm';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { format, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
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
import type { Database } from '@/integrations/supabase/types';


type Announcement = Database['public']['Tables']['priority_announcements']['Row'];

function AnnouncementStatsDisplay({ announcementId }: { announcementId: string }) {
  const { data: stats } = useAnnouncementStats(announcementId);
  
  if (!stats) return <span className="text-muted-foreground">-</span>;
  
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
        <Eye className="h-3 w-3 mr-1" />
        {stats.reads} lu{stats.reads > 1 ? 's' : ''}
      </Badge>
    </div>
  );
}

export default function AdminAnnouncements() {
  const { user } = useAuth();
  const { data: announcements = [], isLoading } = useAllAnnouncements();
  const deleteAnnouncement = useDeleteAnnouncement();

  const [formOpen, setFormOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementWithDetails | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<{ id: string; imagePath?: string | null } | null>(null);

  const handleEdit = (announcement: AnnouncementWithDetails) => {
    setSelectedAnnouncement(announcement);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedAnnouncement(undefined);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!announcementToDelete) return;
    await deleteAnnouncement.mutateAsync(announcementToDelete);
    setDeleteDialogOpen(false);
    setAnnouncementToDelete(null);
  };

  const openDeleteDialog = (announcement: AnnouncementWithDetails) => {
    setAnnouncementToDelete({ id: announcement.id, imagePath: announcement.image_path });
    setDeleteDialogOpen(true);
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Annonces prioritaires</h1>
          <p className="text-muted-foreground">Diffusez des informations prioritaires à vos utilisateurs</p>
        </div>
        <Button onClick={handleCreate} className="bg-helpconfort-blue hover:bg-helpconfort-blue/90">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle annonce
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : announcements.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <p className="text-muted-foreground mb-4">Aucune annonce créée</p>
          <Button onClick={handleCreate} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Créer la première annonce
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {announcements.map((announcement) => {
            const isExpired = isPast(new Date(announcement.expires_at));
            const isActive = announcement.is_active && !isExpired;

            return (
              <Card
                key={announcement.id}
                className="p-4 border-l-4"
                style={{
                  borderLeftColor: isActive ? 'hsl(var(--helpconfort-blue))' : 'hsl(var(--muted))',
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold">{announcement.title}</h3>
                      {isActive ? (
                        <Badge className="bg-emerald-100 text-emerald-700">Actif</Badge>
                      ) : isExpired ? (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600">Expiré</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-100 text-amber-700">Inactif</Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {announcement.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Expire le {format(new Date(announcement.expires_at), 'dd MMM yyyy', { locale: fr })}
                      </div>
                      {announcement.creator && (
                        <div className="text-xs">
                          Créé par {announcement.creator.first_name} {announcement.creator.last_name}
                        </div>
                      )}
                      <AnnouncementStatsDisplay announcementId={announcement.id} />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(announcement)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openDeleteDialog(announcement)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AnnouncementForm
        open={formOpen}
        onOpenChange={setFormOpen}
        announcement={selectedAnnouncement}
        userId={user.id}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'annonce et toutes ses lectures seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
