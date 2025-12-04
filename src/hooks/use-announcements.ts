import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { logError } from '@/lib/logger';

type Announcement = Database['public']['Tables']['priority_announcements']['Row'];
type AnnouncementInsert = Database['public']['Tables']['priority_announcements']['Insert'];
type AnnouncementRead = Database['public']['Tables']['announcement_reads']['Row'];

export type AnnouncementWithDetails = Announcement & {
  creator?: { id: string; first_name: string | null; last_name: string | null } | null;
  reads_count?: number;
};

/**
 * Hook pour récupérer les annonces actives non lues par l'utilisateur
 * Filtre par rôle global et exclude_base_users
 */
export function useUnreadAnnouncements(userId: string | undefined, globalRole?: string) {
  return useQuery({
    queryKey: ['unread-announcements', userId, globalRole],
    queryFn: async () => {
      if (!userId) return [];

      // Récupérer les annonces actives
      const { data: activeAnnouncements, error: announcementsError } = await supabase
        .from('priority_announcements')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (announcementsError) throw announcementsError;

      // Récupérer les lectures de l'utilisateur
      const { data: reads, error: readsError } = await supabase
        .from('announcement_reads')
        .select('announcement_id, status')
        .eq('user_id', userId)
        .eq('status', 'read');

      if (readsError) throw readsError;

      const readAnnouncementIds = new Set(reads?.map(r => r.announcement_id) || []);

      // Filtrer les annonces non lues ET par ciblage
      const filteredAnnouncements = activeAnnouncements?.filter(a => {
        // Déjà lue
        if (readAnnouncementIds.has(a.id)) return false;

        // Si target_all = true, tout le monde voit (sauf exclude_base_users)
        if (a.target_all) {
          // Exclure les base_user si exclude_base_users = true
          if (a.exclude_base_users && globalRole === 'base_user') {
            return false;
          }
          return true;
        }

        // Sinon, vérifier target_global_roles si défini
        const targetRoles = a.target_global_roles as string[] | null;
        if (targetRoles && targetRoles.length > 0 && globalRole) {
          return targetRoles.includes(globalRole);
        }

        // Si pas de ciblage spécifique et target_all = false, ne pas afficher
        return false;
      }) || [];

      return filteredAnnouncements;
    },
    enabled: !!userId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook pour récupérer toutes les annonces (admin)
 */
export function useAllAnnouncements(): ReturnType<typeof useQuery<AnnouncementWithDetails[]>> {
  return useQuery({
    queryKey: ['all-announcements'],
    queryFn: async (): Promise<AnnouncementWithDetails[]> => {
      // Récupérer toutes les annonces
      const { data: announcements, error: announcementsError } = await supabase
        .from('priority_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (announcementsError) throw announcementsError;
      if (!announcements) return [];

      // Récupérer les créateurs
      const creatorIds = [...new Set(announcements
        .map(a => a.created_by)
        .filter(Boolean))];

      if (creatorIds.length === 0) return announcements;

      const { data: creators, error: creatorsError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', creatorIds);

      if (creatorsError) throw creatorsError;

      // Créer un map des créateurs
      const creatorsMap = new Map(
        creators?.map(c => [c.id, c]) || []
      );

      // Récupérer les stats de lecture pour chaque annonce
      const { data: reads } = await supabase
        .from('announcement_reads')
        .select('announcement_id, status')
        .in('announcement_id', announcements.map(a => a.id));

      const readsMap = new Map<string, number>();
      reads?.forEach(r => {
        if (r.status === 'read') {
          readsMap.set(r.announcement_id, (readsMap.get(r.announcement_id) || 0) + 1);
        }
      });

      // Enrichir les annonces
      return announcements.map(a => ({
        ...a,
        creator: a.created_by ? creatorsMap.get(a.created_by) : null,
        reads_count: readsMap.get(a.id) || 0,
      }));
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook pour marquer une annonce comme lue
 */
export function useMarkAnnouncementAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      announcementId, 
      userId, 
      status 
    }: { 
      announcementId: string; 
      userId: string; 
      status: 'read' | 'later' 
    }) => {
      const { error } = await supabase
        .from('announcement_reads')
        .upsert({
          announcement_id: announcementId,
          user_id: userId,
          status,
          read_at: new Date().toISOString(),
        }, {
          onConflict: 'announcement_id,user_id'
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['unread-announcements', variables.userId] });
    },
  });
}

/**
 * Hook pour créer une annonce (admin)
 */
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      imageFile, 
      ...announcement 
    }: AnnouncementInsert & { imageFile?: File | null }) => {
      let image_path = announcement.image_path;

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('announcement-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('announcement-images')
          .getPublicUrl(filePath);

        image_path = publicUrl;
      }

      const { data, error } = await supabase
        .from('priority_announcements')
        .insert({ ...announcement, image_path })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-announcements'] });
      toast.success('Annonce créée avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la création de l\'annonce');
      logError('useCreateAnnouncement', 'Failed to create announcement', error);
    },
  });
}

/**
 * Hook pour mettre à jour une annonce (admin)
 */
export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates,
      imageFile,
      oldImagePath,
    }: { 
      id: string; 
      updates: Partial<Announcement>;
      imageFile?: File | null;
      oldImagePath?: string | null;
    }) => {
      let image_path = updates.image_path;

      // Upload new image if provided
      if (imageFile) {
        // Delete old image if exists
        if (oldImagePath) {
          const oldFileName = oldImagePath.split('/').pop();
          if (oldFileName) {
            await supabase.storage
              .from('announcement-images')
              .remove([oldFileName]);
          }
        }

        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('announcement-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('announcement-images')
          .getPublicUrl(filePath);

        image_path = publicUrl;
      }

      const { data, error } = await supabase
        .from('priority_announcements')
        .update({ ...updates, image_path })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-announcements'] });
      toast.success('Annonce mise à jour');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour');
      logError('useUpdateAnnouncement', 'Failed to update announcement', error);
    },
  });
}

/**
 * Hook pour supprimer une annonce (admin)
 */
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, imagePath }: { id: string; imagePath?: string | null }) => {
      // Delete image from storage if exists
      if (imagePath) {
        const fileName = imagePath.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('announcement-images')
            .remove([fileName]);
        }
      }

      const { error } = await supabase
        .from('priority_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-announcements'] });
      toast.success('Annonce supprimée');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression');
      logError('useDeleteAnnouncement', 'Failed to delete announcement', error);
    },
  });
}

/**
 * Hook pour obtenir les statistiques d'une annonce
 */
export function useAnnouncementStats(announcementId: string) {
  return useQuery({
    queryKey: ['announcement-stats', announcementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcement_reads')
        .select('status')
        .eq('announcement_id', announcementId);

      if (error) throw error;

      const reads = data?.filter(r => r.status === 'read').length || 0;
      const later = data?.filter(r => r.status === 'later').length || 0;

      return { reads, later, total: data?.length || 0 };
    },
    enabled: !!announcementId,
  });
}
