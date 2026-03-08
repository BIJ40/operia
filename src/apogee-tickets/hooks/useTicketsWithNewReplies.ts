/**
 * Hook pour détecter les tickets ayant des réponses non lues
 * (échanges support reçus de la part des utilisateurs)
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { supabase } from '@/integrations/supabase/client';

export interface TicketWithNewReply {
  ticketId: string;
  unreadCount: number;
  lastReplyAt: string;
}

/**
 * Retourne la liste des ticket IDs ayant des réponses non lues
 * côté support (messages reçus de la part des users, non lus par le support)
 */
export function useTicketsWithNewReplies() {
  const { user } = useAuthCore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['tickets-with-new-replies', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // 1. Get tickets where the support HAS already replied at least once
      const { data: supportReplies, error: errSupport } = await supabase
        .from('apogee_ticket_support_exchanges')
        .select('ticket_id')
        .eq('is_from_support', true);

      if (errSupport) throw errSupport;

      const ticketsWithSupportReply = new Set(
        (supportReplies ?? []).map((r) => r.ticket_id)
      );

      // 2. Get unread user messages (not from support, not from current user)
      const { data: exchanges, error } = await supabase
        .from('apogee_ticket_support_exchanges')
        .select('ticket_id, created_at')
        .eq('is_from_support', false)
        .neq('sender_user_id', user.id)
        .is('read_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!exchanges?.length) return [];

      // 3. Only keep exchanges on tickets where support already replied
      const map = new Map<string, TicketWithNewReply>();
      for (const ex of exchanges) {
        if (!ticketsWithSupportReply.has(ex.ticket_id)) continue;

        const existing = map.get(ex.ticket_id);
        if (existing) {
          existing.unreadCount++;
        } else {
          map.set(ex.ticket_id, {
            ticketId: ex.ticket_id,
            unreadCount: 1,
            lastReplyAt: ex.created_at,
          });
        }
      }

      return Array.from(map.values());
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });

  /**
   * Marque toutes les réponses non lues d'un ticket comme lues
   */
  const markAsRead = useCallback(async (ticketId: string) => {
    if (!user) return;

    await supabase
      .from('apogee_ticket_support_exchanges')
      .update({ read_at: new Date().toISOString() })
      .eq('ticket_id', ticketId)
      .eq('is_from_support', false)
      .is('read_at', null);

    // Invalidate to refresh counts
    queryClient.invalidateQueries({ queryKey: ['tickets-with-new-replies'] });
  }, [user, queryClient]);

  return { ...query, markAsRead };
}
