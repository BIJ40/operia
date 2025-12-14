import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

// Rôles N2+ qui reçoivent REQUEST_CREATED
const RH_ROLES = ['franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'];

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
  const { user, globalRole } = useAuth();
  const queryClient = useQueryClient();
  const isRH = globalRole && RH_ROLES.includes(globalRole);

  const query = useQuery({
    queryKey: ['rh-notifications', user?.id, isRH],
    queryFn: async (): Promise<RHNotification[]> => {
      if (!user?.id) return [];
      
      // D'abord récupérer le collaborator_id de l'utilisateur
      const { data: collaborator } = await supabase
        .from('collaborators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Construire les filtres de base
      const filters = [`recipient_id.eq.${user.id}`];
      if (collaborator?.id) {
        filters.push(`collaborator_id.eq.${collaborator.id}`);
      }

      // Récupérer les notifications
      let query = supabase
        .from('rh_notifications')
        .select('*')
        .or(filters.join(','));

      // Filtrer par type selon le rôle
      if (isRH) {
        // N2+ voit REQUEST_CREATED (nouvelles demandes)
        query = query.eq('notification_type', 'REQUEST_CREATED');
      } else {
        // N1 voit uniquement COMPLETED/REJECTED (réponses à ses demandes)
        query = query.in('notification_type', ['REQUEST_COMPLETED', 'REQUEST_REJECTED', 'DOCUMENT_ADDED']);
      }

      const { data, error } = await query
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
  const { user, globalRole } = useAuth();
  const queryClient = useQueryClient();
  const isRH = globalRole && RH_ROLES.includes(globalRole);

  const query = useQuery({
    queryKey: ['rh-notifications-count', user?.id, isRH],
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

      let query = supabase
        .from('rh_notifications')
        .select('*', { count: 'exact', head: true })
        .or(filters.join(','))
        .eq('is_read', false);

      // Filtrer par type selon le rôle
      if (isRH) {
        query = query.eq('notification_type', 'REQUEST_CREATED');
      } else {
        query = query.in('notification_type', ['REQUEST_COMPLETED', 'REQUEST_REJECTED', 'DOCUMENT_ADDED']);
      }

      const { count, error } = await query;

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
