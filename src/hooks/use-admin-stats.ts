import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';

interface AdminStats {
  totalUsers: number;
  totalBlocks: number;
  totalDocuments: number;
  totalTickets: number;
  waitingTickets: number;
  chatbotQueries: number;
  agencies: number;
  isLoading: boolean;
}

const DEFAULT_STATS: AdminStats = {
  totalUsers: 0,
  totalBlocks: 0,
  totalDocuments: 0,
  totalTickets: 0,
  waitingTickets: 0,
  chatbotQueries: 0,
  agencies: 0,
  isLoading: false,
};

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats>({
    ...DEFAULT_STATS,
    isLoading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // V3: Utilise apogee_tickets au lieu de support_tickets
        const waitingStatuses = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'SUPPORT_EN_COURS'];
        
        const [
          usersResult,
          blocksResult,
          documentsResult,
          ticketsResult,
          waitingResult,
          queriesResult,
          agenciesResult,
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('blocks').select('*', { count: 'exact', head: true }),
          supabase.from('documents').select('*', { count: 'exact', head: true }),
          supabase.from('apogee_tickets').select('*', { count: 'exact', head: true }),
          supabase.from('apogee_tickets').select('*', { count: 'exact', head: true }).in('kanban_status', waitingStatuses),
          supabase.from('chatbot_queries').select('*', { count: 'exact', head: true }),
          supabase.from('apogee_agencies').select('*', { count: 'exact', head: true }),
        ]);

        setStats({
          totalUsers: usersResult.count ?? 0,
          totalBlocks: blocksResult.count ?? 0,
          totalDocuments: documentsResult.count ?? 0,
          totalTickets: ticketsResult.count ?? 0,
          waitingTickets: waitingResult.count ?? 0,
          chatbotQueries: queriesResult.count ?? 0,
          agencies: agenciesResult.count ?? 0,
          isLoading: false,
        });
      } catch (error) {
        logError('use-admin-stats', 'Erreur lors de la récupération des stats', error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();
  }, []);

  return stats;
}
