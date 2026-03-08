/**
 * Hook pour gérer les vues de tickets support (tracking des consultations)
 * Permet de savoir si un ticket a reçu une nouvelle réponse depuis la dernière consultation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { logError } from '@/lib/logger';

export interface SupportTicketView {
  ticket_id: string;
  user_id: string;
  viewed_at: string;
}

/**
 * Hook pour récupérer les vues de l'utilisateur connecté
 */
export function useMySupportTicketViews() {
  const { user } = useAuthCore();

  return useQuery({
    queryKey: ['support-ticket-views', user?.id],
    queryFn: async (): Promise<SupportTicketView[]> => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('support_ticket_views')
        .select('ticket_id, user_id, viewed_at')
        .eq('user_id', user.id);

      if (error) {
        logError(error, 'SUPPORT_TICKET_VIEWS_LOAD');
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
export function useMarkSupportTicketAsViewed() {
  const { user } = useAuthCore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      if (!user?.id) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('support_ticket_views')
        .upsert(
          { 
            ticket_id: ticketId, 
            user_id: user.id, 
            viewed_at: new Date().toISOString() 
          },
          { onConflict: 'ticket_id,user_id' }
        );

      if (error) {
        logError(error, 'SUPPORT_TICKET_VIEW_MARK');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket-views'] });
    },
  });
}

/**
 * Hook utilitaire pour savoir si un ticket doit clignoter pour l'utilisateur courant
 * Un ticket clignote si:
 * 1. last_message_by !== current user id (message d'un autre utilisateur)
 * 2. last_message_at > dernière vue de l'utilisateur (pas encore consulté depuis le message)
 */
export function useSupportTicketShouldBlink(
  ticketId: string,
  lastMessageBy: string | null,
  lastMessageAt: string | null
): boolean {
  const { user } = useAuthCore();
  const { data: views = [] } = useMySupportTicketViews();

  // Pas de clignotement si:
  // - Pas de user connecté
  // - Le ticket n'a jamais eu de message
  // - Le dernier message est de l'utilisateur courant
  if (!user?.id || !lastMessageBy || !lastMessageAt) {
    return false;
  }

  if (lastMessageBy === user.id) {
    return false;
  }

  // Chercher la dernière vue de ce ticket par l'utilisateur
  const myView = views.find(v => v.ticket_id === ticketId);
  
  // Si jamais vu, et message d'un autre → clignote
  if (!myView) {
    return true;
  }

  // Comparer les dates
  const messageDate = new Date(lastMessageAt).getTime();
  const viewedDate = new Date(myView.viewed_at).getTime();

  return messageDate > viewedDate;
}

/**
 * Hook pour vérifier si plusieurs tickets doivent clignoter
 * Plus efficace que d'appeler useSupportTicketShouldBlink pour chaque ticket
 */
export function useSupportTicketsBlinkStatus(
  tickets: Array<{ id: string; last_message_by?: string | null; last_message_at?: string | null }>
): Record<string, boolean> {
  const { user } = useAuth();
  const { data: views = [] } = useMySupportTicketViews();

  if (!user?.id) {
    return {};
  }

  const viewsByTicketId = new Map(views.map(v => [v.ticket_id, v]));
  const blinkStatus: Record<string, boolean> = {};

  for (const ticket of tickets) {
    const { id, last_message_by, last_message_at } = ticket;

    // Pas de clignotement si pas de message ou message de l'utilisateur courant
    if (!last_message_by || !last_message_at || last_message_by === user.id) {
      blinkStatus[id] = false;
      continue;
    }

    const myView = viewsByTicketId.get(id);

    // Si jamais vu → clignote
    if (!myView) {
      blinkStatus[id] = true;
      continue;
    }

    // Comparer les dates
    const messageDate = new Date(last_message_at).getTime();
    const viewedDate = new Date(myView.viewed_at).getTime();

    blinkStatus[id] = messageDate > viewedDate;
  }

  return blinkStatus;
}
