/**
 * Hook pour gérer les vues de tickets (tracking des consultations)
 * Permet de savoir si un ticket a été modifié par un autre utilisateur depuis la dernière consultation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { logError } from '@/lib/logger';

export interface TicketView {
  ticket_id: string;
  user_id: string;
  viewed_at: string;
}

/**
 * Hook pour récupérer les vues de l'utilisateur connecté
 */
export function useMyTicketViews() {
  const { user } = useAuthCore();

  return useQuery({
    queryKey: ['apogee-ticket-views', user?.id],
    queryFn: async (): Promise<TicketView[]> => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('apogee_ticket_views')
        .select('ticket_id, user_id, viewed_at')
        .eq('user_id', user.id);

      if (error) {
        logError(error, 'TICKET_VIEWS_LOAD');
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
  });
}

/**
 * Hook pour marquer un ticket comme vu
 */
export function useMarkTicketAsViewed() {
  const { user } = useAuthCore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      if (!user?.id) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('apogee_ticket_views')
        .upsert(
          { 
            ticket_id: ticketId, 
            user_id: user.id, 
            viewed_at: new Date().toISOString() 
          },
          { onConflict: 'ticket_id,user_id' }
        );

      if (error) {
        logError(error, 'TICKET_VIEW_MARK');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apogee-ticket-views'] });
    },
  });
}

/**
 * Hook pour marquer plusieurs tickets comme lus en une seule opération
 */
export function useMarkAllTicketsAsViewed() {
  const { user } = useAuthCore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketIds: string[]) => {
      if (!user?.id) throw new Error('Non authentifié');
      if (ticketIds.length === 0) return;

      const now = new Date().toISOString();
      const views = ticketIds.map(ticketId => ({
        ticket_id: ticketId,
        user_id: user.id,
        viewed_at: now
      }));

      const { error } = await supabase
        .from('apogee_ticket_views')
        .upsert(views, { onConflict: 'ticket_id,user_id' });

      if (error) {
        logError(error, 'TICKET_VIEWS_MARK_ALL');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apogee-ticket-views'] });
    },
  });
}

/**
 * Hook utilitaire pour savoir si un ticket doit clignoter pour l'utilisateur courant
 * Un ticket clignote si:
 * 1. last_modified_by_user_id !== current user id (modifié par quelqu'un d'autre)
 * 2. last_modified_at > dernière vue de l'utilisateur (pas encore consulté depuis la modif)
 */
export function useTicketShouldBlink(
  ticketId: string,
  lastModifiedByUserId: string | null,
  lastModifiedAt: string | null
): boolean {
  const { user } = useAuthCore();
  const { data: views = [] } = useMyTicketViews();

  // Pas de clignotement si:
  // - Pas de user connecté
  // - Le ticket n'a jamais été modifié
  // - Le ticket a été modifié par l'utilisateur courant
  if (!user?.id || !lastModifiedByUserId || !lastModifiedAt) {
    return false;
  }

  if (lastModifiedByUserId === user.id) {
    return false;
  }

  // Chercher la dernière vue de ce ticket par l'utilisateur
  const myView = views.find(v => v.ticket_id === ticketId);
  
  // Si jamais vu, et modifié par quelqu'un d'autre → clignote
  if (!myView) {
    return true;
  }

  // Comparer les dates
  const modifiedDate = new Date(lastModifiedAt).getTime();
  const viewedDate = new Date(myView.viewed_at).getTime();

  return modifiedDate > viewedDate;
}
