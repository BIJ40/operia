/**
 * Hook pour récupérer les tickets projet initiés par l'utilisateur via le support
 * V3: Utilise uniquement apogee_tickets (support_tickets supprimé)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { logError } from '@/lib/logger';

export interface UserProjectTicket {
  id: string;
  ticket_number: number;
  element_concerne: string;
  description: string | null;
  kanban_status: string;
  heat_priority: number | null;
  created_at: string;
  updated_at: string;
  is_urgent_support: boolean;
  // Computed
  unread_exchanges_count?: number;
  has_active_exchange?: boolean;
  last_exchange_at?: string | null;
  // Joined
  apogee_ticket_statuses?: {
    id: string;
    label: string;
    color: string | null;
    is_final: boolean;
  };
}

/**
 * Récupère tous les tickets projet où l'utilisateur est l'initiateur support
 */
export function useUserProjectTickets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-project-tickets', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get tickets initiated by user
      const { data: tickets, error: ticketsError } = await supabase
        .from('apogee_tickets')
        .select(`
          id,
          ticket_number,
          element_concerne,
          description,
          kanban_status,
          heat_priority,
          created_at,
          updated_at,
          is_urgent_support,
          apogee_ticket_statuses(id, label, color, is_final)
        `)
        .eq('support_initiator_user_id', user.id)
        .order('created_at', { ascending: false });

      if (ticketsError) {
        logError('useUserProjectTickets', 'Failed to fetch tickets', ticketsError);
        throw ticketsError;
      }

      if (!tickets?.length) return [];

      const ticketIds = tickets.map(t => t.id);

      // Get exchange stats for these tickets
      const { data: exchanges, error: exchangesError } = await supabase
        .from('apogee_ticket_support_exchanges')
        .select('ticket_id, read_at, created_at, sender_user_id')
        .in('ticket_id', ticketIds);

      if (exchangesError) {
        logError('useUserProjectTickets', 'Failed to fetch exchanges', exchangesError);
      }

      // Calculate stats per ticket
      const exchangeStats: Record<string, {
        unread: number;
        hasActive: boolean;
        lastAt: string | null;
      }> = {};

      for (const ex of exchanges || []) {
        if (!exchangeStats[ex.ticket_id]) {
          exchangeStats[ex.ticket_id] = { unread: 0, hasActive: false, lastAt: null };
        }
        
        // Count unread from support
        if (ex.sender_user_id !== user.id && !ex.read_at) {
          exchangeStats[ex.ticket_id].unread++;
        }
        
        // Track last exchange
        if (!exchangeStats[ex.ticket_id].lastAt || ex.created_at > exchangeStats[ex.ticket_id].lastAt!) {
          exchangeStats[ex.ticket_id].lastAt = ex.created_at;
        }
        
        // Has active = has any exchange at all
        exchangeStats[ex.ticket_id].hasActive = true;
      }

      // Merge data
      return tickets.map(ticket => ({
        ...ticket,
        unread_exchanges_count: exchangeStats[ticket.id]?.unread || 0,
        has_active_exchange: exchangeStats[ticket.id]?.hasActive || false,
        last_exchange_at: exchangeStats[ticket.id]?.lastAt || null,
      })) as UserProjectTicket[];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

/**
 * V3: Récupère uniquement les tickets projet (support_tickets supprimé)
 */
export function useCombinedUserTickets() {
  const { data: projectTickets = [], isLoading: projectLoading } = useUserProjectTickets();

  // V3: Plus de support_tickets - uniquement apogee_tickets
  const combinedTickets = projectTickets.map(t => ({
    id: t.id,
    subject: t.element_concerne,
    status: t.kanban_status,
    heat_priority: t.heat_priority,
    created_at: t.created_at,
    ticketType: 'project' as const,
    unread_exchanges_count: t.unread_exchanges_count || 0,
    has_active_exchange: t.has_active_exchange || false,
    statusLabel: t.apogee_ticket_statuses?.label,
    statusColor: t.apogee_ticket_statuses?.color,
    isFinal: t.apogee_ticket_statuses?.is_final,
  }));

  return {
    tickets: combinedTickets,
    isLoading: projectLoading,
    projectTicketsCount: projectTickets.length,
    supportTicketsCount: 0, // Legacy - toujours 0
  };
}
