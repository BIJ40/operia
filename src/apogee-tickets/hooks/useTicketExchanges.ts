/**
 * Hook pour gérer les échanges bidirectionnels support ↔ utilisateur
 * sur les tickets projet créés depuis le support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { logError } from '@/lib/logger';
import { errorToast, successToast } from '@/lib/toastHelpers';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface TicketExchange {
  id: string;
  ticket_id: string;
  sender_user_id: string;
  is_from_support: boolean;
  message: string;
  read_at: string | null;
  created_at: string;
  // Joined data
  sender?: {
    first_name: string | null;
    last_name: string | null;
  };
}

interface UseTicketExchangesOptions {
  ticketId: string;
  enabled?: boolean;
}

export function useTicketExchanges({ ticketId, enabled = true }: UseTicketExchangesOptions) {
  const { user } = useAuthCore();
  const queryClient = useQueryClient();

  // Fetch exchanges for this ticket
  const { data: exchanges = [], isLoading, refetch } = useQuery({
    queryKey: ['ticket-exchanges', ticketId],
    queryFn: async () => {
      // Get exchanges
      const { data: exchangesData, error } = await supabase
        .from('apogee_ticket_support_exchanges')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        logError('useTicketExchanges', 'Failed to fetch exchanges', error);
        throw error;
      }

      if (!exchangesData?.length) return [];

      // Get unique sender IDs and fetch profiles separately
      const senderIds = [...new Set(exchangesData.map(e => e.sender_user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', senderIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return exchangesData.map(e => ({
        ...e,
        sender: profilesMap.get(e.sender_user_id) || null,
      })) as TicketExchange[];
    },
    enabled: enabled && !!ticketId,
    staleTime: 30 * 1000,
  });

  // Send a new message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, isFromSupport }: { message: string; isFromSupport: boolean }) => {
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('apogee_ticket_support_exchanges')
        .insert({
          ticket_id: ticketId,
          sender_user_id: user.id,
          is_from_support: isFromSupport,
          message,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-exchanges', ticketId] });
    },
    onError: (error) => {
      logError('useTicketExchanges', 'Failed to send message', error);
      errorToast('Erreur lors de l\'envoi du message');
    },
  });

  // Mark exchanges as read
  const markAsReadMutation = useMutation({
    mutationFn: async (exchangeIds: string[]) => {
      const { error } = await supabase
        .from('apogee_ticket_support_exchanges')
        .update({ read_at: new Date().toISOString() })
        .in('id', exchangeIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-exchanges', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['user-project-tickets'] });
      // Invalider les compteurs de notifications pour que les badges disparaissent
      queryClient.invalidateQueries({ queryKey: ['user-project-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['support-project-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['user-project-unread-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-project-unread-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['combined-user-tickets'] });
    },
  });

  // Guard against concurrent/retry-loop calls
  const markingRef = useRef(false);

  // Mark all unread messages as read (for the current user's perspective)
  const markAllAsRead = useCallback(async () => {
    if (!user || markingRef.current) return;

    // Get unread messages sent TO me (opposite of is_from_support based on who I am)
    const unreadIds = exchanges
      .filter(e => e.read_at === null && e.sender_user_id !== user.id)
      .map(e => e.id);

    if (unreadIds.length > 0) {
      markingRef.current = true;
      try {
        await markAsReadMutation.mutateAsync(unreadIds);
      } catch {
        // Silently fail - avoid retry loops
      } finally {
        markingRef.current = false;
      }
    }
  }, [user, exchanges, markAsReadMutation]);

  // Count unread messages for the user
  const unreadCount = exchanges.filter(
    e => e.read_at === null && e.sender_user_id !== user?.id
  ).length;

  // Realtime subscription
  useEffect(() => {
    if (!ticketId || !enabled) return;

    const channel = supabase
      .channel(`exchanges-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'apogee_ticket_support_exchanges',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload: RealtimePostgresChangesPayload<TicketExchange>) => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, enabled, refetch]);

  return {
    exchanges,
    isLoading,
    unreadCount,
    sendMessage: (message: string, isFromSupport: boolean) => 
      sendMessageMutation.mutateAsync({ message, isFromSupport }),
    isSending: sendMessageMutation.isPending,
    markAllAsRead,
    refetch,
  };
}

/**
 * Hook pour obtenir le nombre de messages non lus sur tous les tickets projet de l'utilisateur
 */
export function useUserProjectTicketsUnreadCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-project-tickets-unread', user?.id],
    queryFn: async () => {
      if (!user) return {};

      // Get all tickets where user is initiator
      const { data: tickets, error: ticketsError } = await supabase
        .from('apogee_tickets')
        .select('id')
        .eq('support_initiator_user_id', user.id);

      if (ticketsError) throw ticketsError;
      if (!tickets?.length) return {};

      const ticketIds = tickets.map(t => t.id);

      // Get unread exchanges for these tickets
      const { data: exchanges, error: exchangesError } = await supabase
        .from('apogee_ticket_support_exchanges')
        .select('ticket_id')
        .in('ticket_id', ticketIds)
        .neq('sender_user_id', user.id)
        .is('read_at', null);

      if (exchangesError) throw exchangesError;

      // Count by ticket
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
