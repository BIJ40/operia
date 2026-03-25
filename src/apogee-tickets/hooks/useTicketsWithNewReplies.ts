/**
 * Hook pour détecter les tickets ayant des réponses/échanges non lues
 * 
 * Logique:
 * - Un ticket apparaît dans "Réponses" s'il a des échanges non lus (read_at IS NULL)
 *   envoyés par un autre utilisateur (sender_user_id != moi)
 * - "Réponses" prend le dessus sur "Nouveaux" : si un ticket est dans Réponses,
 *   il ne doit PAS apparaître dans Nouveaux
 * - Une fois lu (ouverture du ticket → markAsRead), le ticket disparaît de l'onglet
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
 * Retourne la liste des ticket IDs ayant des échanges non lus par l'utilisateur courant
 */
export function useTicketsWithNewReplies() {
  const { user } = useAuthCore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['tickets-with-new-replies', user?.id],
    queryFn: async (): Promise<TicketWithNewReply[]> => {
      if (!user) return [];

      // Get all unread exchanges NOT sent by current user
      const { data: exchanges, error } = await supabase
        .from('apogee_ticket_support_exchanges')
        .select('ticket_id, created_at')
        .neq('sender_user_id', user.id)
        .is('read_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!exchanges?.length) return [];

      // Aggregate by ticket
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
    refetchInterval: 30_000,
  });

  /**
   * Marque toutes les réponses non lues d'un ticket comme lues pour l'utilisateur courant
   */
  const markAsRead = useCallback(async (ticketId: string) => {
    if (!user) return;

    await supabase
      .from('apogee_ticket_support_exchanges')
      .update({ read_at: new Date().toISOString() })
      .eq('ticket_id', ticketId)
      .neq('sender_user_id', user.id)
      .is('read_at', null);

    // Invalidate to refresh counts
    queryClient.invalidateQueries({ queryKey: ['tickets-with-new-replies'] });
  }, [user, queryClient]);

  return { ...query, markAsRead };
}
