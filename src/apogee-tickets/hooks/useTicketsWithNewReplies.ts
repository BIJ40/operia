/**
 * Hook pour détecter les tickets ayant des réponses non lues
 * (échanges support reçus de la part des utilisateurs)
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tickets-with-new-replies', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get all unread support exchanges NOT from current user (= replies from users)
      const { data: exchanges, error } = await supabase
        .from('apogee_ticket_support_exchanges')
        .select('ticket_id, created_at')
        .eq('is_from_support', false)
        .neq('sender_user_id', user.id)
        .is('read_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!exchanges?.length) return [];

      // Group by ticket
      const map = new Map<string, TicketWithNewReply>();
      for (const ex of exchanges) {
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
    refetchInterval: 30_000, // Poll every 30s
  });
}
