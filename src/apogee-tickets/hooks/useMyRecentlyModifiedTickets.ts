import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';

export interface RecentTicket {
  id: string;
  ticket_number: number;
  element_concerne: string;
  last_modified_at: string;
  kanban_status: string;
}

export function useMyRecentlyModifiedTickets(limit = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-recently-modified-tickets', user?.id, limit],
    queryFn: async (): Promise<RecentTicket[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('apogee_tickets')
        .select('id, ticket_number, element_concerne, last_modified_at, kanban_status')
        .eq('last_modified_by_user_id', user.id)
        .not('last_modified_at', 'is', null)
        .order('last_modified_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recently modified tickets:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
  });
}
