import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/logger';

export interface PriorityAnnouncement {
  id: string;
  title: string;
  content: string;
  image_path: string | null;
  is_active: boolean;
  expires_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  target_all: boolean;
  target_global_roles: string[];
  target_role_agences: string[];
  exclude_base_users: boolean;
}

export interface AnnouncementRead {
  id: string;
  announcement_id: string;
  user_id: string;
  status: 'read' | 'later';
  read_at: string;
}

export interface AnnouncementWithStats extends PriorityAnnouncement {
  total_targeted: number;
  read_count: number;
  later_count: number;
  unread_count: number;
}

export interface UserReadStatus {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: 'read' | 'later' | 'unread';
  read_at: string | null;
}

/**
 * Hook pour récupérer les annonces actives pour l'utilisateur connecté
 * Filtre par ciblage, expiration, et statut de lecture (24h pour "plus tard")
 */
export function useActiveAnnouncements() {
  const { user, globalRole, roleAgence } = useAuth();

  return useQuery({
    queryKey: ['active-announcements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Récupérer toutes les annonces actives non expirées
      const { data: announcements, error: announcementsError } = await supabase
        .from('priority_announcements')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (announcementsError) {
        logError(announcementsError, 'FETCH_ACTIVE_ANNOUNCEMENTS');
        return [];
      }

      // Récupérer les lectures de l'utilisateur
      const { data: reads, error: readsError } = await supabase
        .from('announcement_reads')
        .select('*')
        .eq('user_id', user.id);

      if (readsError) {
        logError(readsError, 'FETCH_ANNOUNCEMENT_READS');
      }

      const readsMap = new Map(reads?.map(r => [r.announcement_id, r]) || []);
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Filtrer les annonces
      return (announcements as PriorityAnnouncement[]).filter(announcement => {
        // Vérifier le ciblage
        const isTargeted = checkTargeting(announcement, globalRole, roleAgence);
        if (!isTargeted) return false;

        // Vérifier le statut de lecture
        const read = readsMap.get(announcement.id);
        if (!read) return true; // Jamais lu = afficher

        if (read.status === 'read') return false; // Lu définitivement = ne pas afficher

        // Si "plus tard", vérifier si 24h se sont écoulées
        if (read.status === 'later') {
          const readAt = new Date(read.read_at);
          return readAt < twentyFourHoursAgo;
        }

        return true;
      });
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Vérifie si un utilisateur est ciblé par une annonce
 */
function checkTargeting(
  announcement: PriorityAnnouncement,
  globalRole: string | null,
  roleAgence: string | null
): boolean {
  // Exclusion N0 (base_user)
  if (announcement.exclude_base_users && globalRole === 'base_user') {
    return false;
  }

  // Si target_all = true, tout le monde est ciblé (sauf N0 si exclude_base_users)
  if (announcement.target_all) {
    return true;
  }

  // Vérifier si le rôle global est ciblé
  const targetRoles = announcement.target_global_roles || [];
  if (globalRole && targetRoles.includes(globalRole)) {
    return true;
  }

  // Vérifier si le rôle agence est ciblé
  const targetAgences = announcement.target_role_agences || [];
  if (roleAgence && targetAgences.includes(roleAgence)) {
    return true;
  }

  // Si aucun ciblage défini et target_all = false, ne pas afficher
  return targetRoles.length === 0 && targetAgences.length === 0;
}

/**
 * Hook pour marquer une annonce comme lue ou reportée
 */
export function useMarkAnnouncement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ announcementId, status }: { announcementId: string; status: 'read' | 'later' }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('announcement_reads')
        .upsert({
          announcement_id: announcementId,
          user_id: user.id,
          status,
          read_at: new Date().toISOString(),
        }, {
          onConflict: 'announcement_id,user_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-announcements'] });
    },
    onError: (error) => {
      logError(error, 'MARK_ANNOUNCEMENT');
    },
  });
}

/**
 * Hook admin pour gérer les annonces
 */
export function useAnnouncementsAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const announcementsQuery = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('priority_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logError(error, 'FETCH_ADMIN_ANNOUNCEMENTS');
        throw error;
      }

      return data as PriorityAnnouncement[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (announcement: Omit<PriorityAnnouncement, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('priority_announcements')
        .insert(announcement)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Annonce créée', description: 'L\'annonce a été créée avec succès.' });
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
    },
    onError: (error) => {
      logError(error, 'CREATE_ANNOUNCEMENT');
      toast({ title: 'Erreur', description: 'Impossible de créer l\'annonce.', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PriorityAnnouncement> & { id: string }) => {
      const { data, error } = await supabase
        .from('priority_announcements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Annonce mise à jour', description: 'L\'annonce a été modifiée avec succès.' });
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
    },
    onError: (error) => {
      logError(error, 'UPDATE_ANNOUNCEMENT');
      toast({ title: 'Erreur', description: 'Impossible de modifier l\'annonce.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('priority_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Annonce supprimée', description: 'L\'annonce a été supprimée.' });
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
    },
    onError: (error) => {
      logError(error, 'DELETE_ANNOUNCEMENT');
      toast({ title: 'Erreur', description: 'Impossible de supprimer l\'annonce.', variant: 'destructive' });
    },
  });

  return {
    announcements: announcementsQuery.data || [],
    isLoading: announcementsQuery.isLoading,
    createAnnouncement: createMutation.mutate,
    updateAnnouncement: updateMutation.mutate,
    deleteAnnouncement: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook pour récupérer les statistiques de lecture d'une annonce
 */
export function useAnnouncementStats(announcementId: string | null) {
  return useQuery({
    queryKey: ['announcement-stats', announcementId],
    queryFn: async () => {
      if (!announcementId) return null;

      // Récupérer l'annonce
      const { data: announcement, error: announcementError } = await supabase
        .from('priority_announcements')
        .select('*')
        .eq('id', announcementId)
        .single();

      if (announcementError) {
        logError(announcementError, 'FETCH_ANNOUNCEMENT_FOR_STATS');
        throw announcementError;
      }

      // Récupérer tous les utilisateurs avec leur profil
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, global_role, role_agence');

      if (profilesError) {
        logError(profilesError, 'FETCH_PROFILES_FOR_STATS');
        throw profilesError;
      }

      // Filtrer les utilisateurs ciblés
      const targetedUsers = profiles.filter(profile => {
        const ann = announcement as PriorityAnnouncement;
        if (ann.exclude_base_users && profile.global_role === 'base_user') return false;
        if (ann.target_all) return true;
        
        const targetRoles = ann.target_global_roles || [];
        const targetAgences = ann.target_role_agences || [];
        
        if (profile.global_role && targetRoles.includes(profile.global_role)) return true;
        if (profile.role_agence && targetAgences.includes(profile.role_agence)) return true;
        
        return targetRoles.length === 0 && targetAgences.length === 0;
      });

      // Récupérer les lectures pour cette annonce
      const { data: reads, error: readsError } = await supabase
        .from('announcement_reads')
        .select('*')
        .eq('announcement_id', announcementId);

      if (readsError) {
        logError(readsError, 'FETCH_READS_FOR_STATS');
      }

      const readsMap = new Map((reads || []).map(r => [r.user_id, r]));

      // Construire la liste avec statuts
      const userStatuses: UserReadStatus[] = targetedUsers.map(user => {
        const read = readsMap.get(user.id);
        return {
          user_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          status: read ? (read.status as 'read' | 'later') : 'unread',
          read_at: read?.read_at || null,
        };
      });

      const readCount = userStatuses.filter(u => u.status === 'read').length;
      const laterCount = userStatuses.filter(u => u.status === 'later').length;

      return {
        announcement: announcement as PriorityAnnouncement,
        users: userStatuses,
        stats: {
          total: targetedUsers.length,
          read: readCount,
          later: laterCount,
          unread: targetedUsers.length - readCount - laterCount,
        },
      };
    },
    enabled: !!announcementId,
  });
}
