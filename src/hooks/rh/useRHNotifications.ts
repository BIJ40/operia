import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export type RHNotificationType = 
  | 'REQUEST_CREATED'
  | 'REQUEST_COMPLETED'
  | 'REQUEST_REJECTED'
  | 'DOCUMENT_ADDED'
  | 'REQUEST_IN_PROGRESS';

export interface RHNotification {
  id: string;
  agency_id: string;
  collaborator_id: string;
  recipient_id: string | null;
  sender_id: string | null;
  notification_type: RHNotificationType;
  related_request_id: string | null;
  related_document_id: string | null;
  title: string;
  message: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

/**
 * Hook pour récupérer les notifications RH de l'utilisateur
 */
export function useRHNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['rh-notifications', user?.id],
    queryFn: async (): Promise<RHNotification[]> => {
      if (!user?.id) return [];
      
      // D'abord récupérer le collaborator_id de l'utilisateur
      const { data: collaborator } = await supabase
        .from('collaborators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Construire les filtres
      const filters = [`recipient_id.eq.${user.id}`];
      if (collaborator?.id) {
        filters.push(`collaborator_id.eq.${collaborator.id}`);
      }

      // Récupérer les notifications où l'utilisateur est destinataire (recipient_id)
      // OU où son collaborator_id est référencé
      const { data, error } = await supabase
        .from('rh_notifications')
        .select('*')
        .or(filters.join(','))
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[useRHNotifications] Error:', error);
        throw error;
      }
      return (data || []) as unknown as RHNotification[];
    },
    enabled: !!user,
  });

  // Realtime subscription pour les nouvelles notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('rh-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rh_notifications',
        },
        () => {
          // Invalider le cache pour rafraîchir
          queryClient.invalidateQueries({ queryKey: ['rh-notifications'] });
          queryClient.invalidateQueries({ queryKey: ['rh-notifications-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

/**
 * Hook pour compter les notifications non lues
 */
export function useUnreadRHNotificationsCount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['rh-notifications-count', user?.id],
    queryFn: async (): Promise<number> => {
      if (!user?.id) return 0;
      
      // Compter directement via une requête
      const { data: collaborator } = await supabase
        .from('collaborators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Construire les filtres
      const filters = [`recipient_id.eq.${user.id}`];
      if (collaborator?.id) {
        filters.push(`collaborator_id.eq.${collaborator.id}`);
      }

      const { count, error } = await supabase
        .from('rh_notifications')
        .select('*', { count: 'exact', head: true })
        .or(filters.join(','))
        .eq('is_read', false);

      if (error) {
        console.error('[useUnreadRHNotificationsCount] Error:', error);
        throw error;
      }
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 60000, // Rafraîchir toutes les minutes
  });

  // Realtime pour le compteur
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('rh-notifications-count-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rh_notifications',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['rh-notifications-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

/**
 * Hook pour marquer des notifications comme lues
 */
export function useMarkRHNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: string[]): Promise<number> => {
      // Mettre à jour directement via query
      const { data, error } = await supabase
        .from('rh_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', notificationIds)
        .eq('is_read', false)
        .select();
      
      if (error) throw error;
      return data?.length || 0;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['rh-notifications-count'] });
    },
  });
}

/**
 * Hook pour marquer toutes les notifications comme lues
 */
export function useMarkAllRHNotificationsRead() {
  const queryClient = useQueryClient();
  const { data: notifications } = useRHNotifications();

  return useMutation({
    mutationFn: async (): Promise<number> => {
      const unreadIds = notifications
        ?.filter((n) => !n.is_read)
        .map((n) => n.id) || [];
      
      if (unreadIds.length === 0) return 0;

      const { data, error } = await supabase
        .from('rh_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds)
        .select();
      
      if (error) throw error;
      return data?.length || 0;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['rh-notifications-count'] });
    },
  });
}
