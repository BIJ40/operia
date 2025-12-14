import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export type PlanningNotificationType = 'PLANNING_SENT' | 'PLANNING_SIGNED';

export interface PlanningNotification {
  id: string;
  agency_id: string;
  tech_id: number;
  recipient_user_id: string;
  sender_user_id: string | null;
  notification_type: PlanningNotificationType;
  week_start: string;
  title: string;
  message: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

/**
 * Hook pour récupérer les notifications de planning de l'utilisateur
 */
export function usePlanningNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['planning-notifications', user?.id],
    queryFn: async (): Promise<PlanningNotification[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('planning_notifications')
        .select('*')
        .eq('recipient_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[usePlanningNotifications] Error:', error);
        throw error;
      }
      return (data || []) as unknown as PlanningNotification[];
    },
    enabled: !!user,
  });

  // Realtime subscription pour les nouvelles notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('planning-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'planning_notifications',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['planning-notifications'] });
          queryClient.invalidateQueries({ queryKey: ['planning-notifications-count'] });
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
export function useUnreadPlanningNotificationsCount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['planning-notifications-count', user?.id],
    queryFn: async (): Promise<number> => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('planning_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('[useUnreadPlanningNotificationsCount] Error:', error);
        throw error;
      }
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Realtime pour le compteur
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('planning-notifications-count-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planning_notifications',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['planning-notifications-count'] });
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
export function useMarkPlanningNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: string[]): Promise<number> => {
      const { data, error } = await supabase
        .from('planning_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', notificationIds)
        .eq('is_read', false)
        .select();

      if (error) throw error;
      return data?.length || 0;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['planning-notifications-count'] });
    },
  });
}

/**
 * Hook pour marquer toutes les notifications comme lues
 */
export function useMarkAllPlanningNotificationsRead() {
  const queryClient = useQueryClient();
  const { data: notifications } = usePlanningNotifications();

  return useMutation({
    mutationFn: async (): Promise<number> => {
      const unreadIds = notifications?.filter((n) => !n.is_read).map((n) => n.id) || [];

      if (unreadIds.length === 0) return 0;

      const { data, error } = await supabase
        .from('planning_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds)
        .select();

      if (error) throw error;
      return data?.length || 0;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['planning-notifications-count'] });
    },
  });
}

/**
 * Helper pour créer une notification de planning
 */
export async function createPlanningNotification(params: {
  agencyId: string;
  techId: number;
  recipientUserId: string;
  senderUserId: string;
  notificationType: PlanningNotificationType;
  weekStart: string;
  techName?: string;
}): Promise<void> {
  const weekLabel = format(new Date(params.weekStart), "'Semaine du' d MMMM", { locale: fr });

  let title: string;
  let message: string;

  if (params.notificationType === 'PLANNING_SENT') {
    title = 'Planning à signer';
    message = `Votre planning (${weekLabel}) est prêt à être signé.`;
  } else {
    title = 'Planning signé';
    message = `${params.techName || 'Le technicien'} a signé son planning (${weekLabel}).`;
  }

  const { error } = await supabase.from('planning_notifications').insert({
    agency_id: params.agencyId,
    tech_id: params.techId,
    recipient_user_id: params.recipientUserId,
    sender_user_id: params.senderUserId,
    notification_type: params.notificationType,
    week_start: params.weekStart,
    title,
    message,
  });

  if (error) {
    console.error('[createPlanningNotification] Error:', error);
  }
}
