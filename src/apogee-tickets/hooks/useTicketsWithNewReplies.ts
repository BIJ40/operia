/**
 * Hook pour détecter les tickets ayant des réponses (commentaires) non lues.
 *
 * Logique :
 * - Un ticket apparaît dans "Réponses" s'il a des commentaires postés par un
 *   autre utilisateur APRÈS la dernière vue du ticket par l'utilisateur courant.
 * - "Réponses" prend le dessus sur "Nouveaux" : si un ticket est dans Réponses,
 *   il ne doit PAS apparaître dans Nouveaux.
 * - L'ouverture du ticket met à jour la vue (markAsViewed) → le ticket sort de l'onglet.
 *
 * On combine aussi les `apogee_ticket_support_exchanges` non lus pour ne rien perdre.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { supabase } from '@/integrations/supabase/client';
import { useMyTicketViews } from './useTicketViews';

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
  const { data: myViews = [] } = useMyTicketViews();

  const query = useQuery({
    queryKey: ['tickets-with-new-replies', user?.id, myViews],
    queryFn: async (): Promise<TicketWithNewReply[]> => {
      if (!user) return [];

      // Build a map of viewed_at per ticket for the current user
      const viewMap = new Map<string, string>();
      for (const v of myViews) {
        viewMap.set(v.ticket_id, v.viewed_at);
      }

      // 1. Fetch recent comments by OTHER users
      const { data: comments, error: commentsError } = await supabase
        .from('apogee_ticket_comments')
        .select('ticket_id, created_at, created_by_user_id')
        .neq('created_by_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500);

      if (commentsError) throw commentsError;

      // 2. Also check support exchanges (legacy)
      const { data: exchanges } = await supabase
        .from('apogee_ticket_support_exchanges')
        .select('ticket_id, created_at')
        .neq('sender_user_id', user.id)
        .is('read_at', null)
        .order('created_at', { ascending: false });

      // 3. Aggregate: a ticket is in "Réponses" if it has comments/exchanges
      //    created AFTER the user's last view of that ticket
      const map = new Map<string, TicketWithNewReply>();

      const addEntry = (ticketId: string, createdAt: string) => {
        const viewedAt = viewMap.get(ticketId);
        // If user has viewed after this reply, skip it
        if (viewedAt && new Date(createdAt).getTime() <= new Date(viewedAt).getTime()) {
          return;
        }
        const existing = map.get(ticketId);
        if (existing) {
          existing.unreadCount++;
        } else {
          map.set(ticketId, {
            ticketId,
            unreadCount: 1,
            lastReplyAt: createdAt,
          });
        }
      };

      // Comments by others after last view
      for (const c of comments || []) {
        if (c.created_by_user_id && c.created_by_user_id !== user.id) {
          addEntry(c.ticket_id, c.created_at);
        }
      }

      // Support exchanges not read
      for (const ex of exchanges || []) {
        addEntry(ex.ticket_id, ex.created_at);
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

    // Mark support exchanges as read (legacy)
    await supabase
      .from('apogee_ticket_support_exchanges')
      .update({ read_at: new Date().toISOString() })
      .eq('ticket_id', ticketId)
      .neq('sender_user_id', user.id)
      .is('read_at', null);

    // Invalidate to refresh counts
    queryClient.invalidateQueries({ queryKey: ['tickets-with-new-replies'] });
    queryClient.invalidateQueries({ queryKey: ['apogee-ticket-views'] });
  }, [user, queryClient]);

  return { ...query, markAsRead };
}
