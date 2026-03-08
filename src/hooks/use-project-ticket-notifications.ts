/**
 * Hook pour les notifications liées aux échanges sur les tickets projet
 * 
 * CÔTÉ UTILISATEUR:
 * - Compte les messages non lus du support sur les tickets où l'utilisateur est initiateur
 * 
 * CÔTÉ SUPPORT:
 * - Compte les messages non lus des utilisateurs sur tous les tickets avec échanges actifs
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { logError } from '@/lib/logger';

/**
 * Hook pour les utilisateurs normaux - Compte des messages non lus du support
 * sur leurs tickets projet initiés via le chat support
 */
export function useUserProjectUnreadCount() {
  const { user } = useAuthCore();
  const queryClient = useQueryClient();

  const { data: totalUnreadCount = 0, refetch } = useQuery({
    queryKey: ['user-project-unread-total', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      // Get all tickets where user is initiator
      const { data: tickets, error: ticketsError } = await supabase
        .from('apogee_tickets')
        .select('id')
        .eq('support_initiator_user_id', user.id);

      if (ticketsError) {
        logError('useUserProjectUnreadCount', 'Failed to fetch tickets', ticketsError);
        return 0;
      }

      if (!tickets?.length) return 0;

      const ticketIds = tickets.map(t => t.id);

      // Count unread exchanges from support (is_from_support=true)
      const { count, error: countError } = await supabase
        .from('apogee_ticket_support_exchanges')
        .select('*', { count: 'exact', head: true })
        .in('ticket_id', ticketIds)
        .eq('is_from_support', true)
        .is('read_at', null);

      if (countError) {
        logError('useUserProjectUnreadCount', 'Failed to count unread', countError);
        return 0;
      }

      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-project-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'apogee_ticket_support_exchanges',
        },
        () => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['user-project-tickets'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch, queryClient]);

  return { unreadCount: totalUnreadCount, refetch };
}

/**
 * Hook pour le support - Compte des messages non lus des utilisateurs
 * sur les tickets projet avec échanges
 */
export function useSupportProjectUnreadCount() {
  const { user } = useAuthCore();
  const { isSupport, isAdmin } = usePermissions();
  const queryClient = useQueryClient();

  const { data: totalUnreadCount = 0, refetch } = useQuery({
    queryKey: ['support-project-unread-total', user?.id],
    queryFn: async () => {
      if (!user || (!isSupport && !isAdmin)) return 0;

      // Count unread exchanges from users (is_from_support=false)
      const { count, error } = await supabase
        .from('apogee_ticket_support_exchanges')
        .select('*', { count: 'exact', head: true })
        .eq('is_from_support', false)
        .is('read_at', null);

      if (error) {
        logError('useSupportProjectUnreadCount', 'Failed to count unread', error);
        return 0;
      }

      return count ?? 0;
    },
    enabled: !!user && (isSupport || isAdmin),
    staleTime: 30 * 1000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user || (!isSupport && !isAdmin)) return;

    const channel = supabase
      .channel('support-project-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'apogee_ticket_support_exchanges',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isSupport, isAdmin, refetch]);

  return { unreadCount: totalUnreadCount, refetch };
}

/**
 * Hook combiné pour obtenir la liste des tickets avec des messages non lus
 * côté utilisateur (pour faire clignoter les tickets dans la liste)
 */
export function useUserProjectUnreadTickets() {
  const { user } = useAuthCore();

  return useQuery({
    queryKey: ['user-project-unread-tickets', user?.id],
    queryFn: async () => {
      if (!user) return {};

      // Get all tickets where user is initiator
      const { data: tickets, error: ticketsError } = await supabase
        .from('apogee_tickets')
        .select('id')
        .eq('support_initiator_user_id', user.id);

      if (ticketsError || !tickets?.length) return {};

      const ticketIds = tickets.map(t => t.id);

      // Get unread exchanges per ticket
      const { data: exchanges, error } = await supabase
        .from('apogee_ticket_support_exchanges')
        .select('ticket_id')
        .in('ticket_id', ticketIds)
        .eq('is_from_support', true)
        .is('read_at', null);

      if (error) return {};

      // Count per ticket
      const counts: Record<string, number> = {};
      for (const ex of exchanges || []) {
        counts[ex.ticket_id] = (counts[ex.ticket_id] || 0) + 1;
      }

      return counts;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook pour le support - Liste des tickets avec messages non lus
 */
export function useSupportProjectUnreadTickets() {
  const { user } = useAuthCore();
  const { isSupport, isAdmin } = usePermissions();

  return useQuery({
    queryKey: ['support-project-unread-tickets', user?.id],
    queryFn: async () => {
      if (!user || (!isSupport && !isAdmin)) return {};

      // Get unread exchanges per ticket from users
      const { data: exchanges, error } = await supabase
        .from('apogee_ticket_support_exchanges')
        .select('ticket_id')
        .eq('is_from_support', false)
        .is('read_at', null);

      if (error) return {};

      // Count per ticket
      const counts: Record<string, number> = {};
      for (const ex of exchanges || []) {
        counts[ex.ticket_id] = (counts[ex.ticket_id] || 0) + 1;
      }

      return counts;
    },
    enabled: !!user && (isSupport || isAdmin),
    staleTime: 30 * 1000,
  });
}
