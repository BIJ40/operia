import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
import { safeQuery } from '@/lib/safeQuery';

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
        // Récupérer toutes les stats en parallèle
        const [
          usersResult,
          blocksResult,
          documentsResult,
          ticketsResult,
          waitingResult,
          queriesResult,
          agenciesResult,
        ] = await Promise.all([
          safeQuery<{ count: number }>(
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            'ADMIN_STATS_USERS'
          ),
          safeQuery<{ count: number }>(
            supabase.from('blocks').select('*', { count: 'exact', head: true }),
            'ADMIN_STATS_BLOCKS'
          ),
          safeQuery<{ count: number }>(
            supabase.from('documents').select('*', { count: 'exact', head: true }),
            'ADMIN_STATS_DOCUMENTS'
          ),
          safeQuery<{ count: number }>(
            supabase.from('support_tickets').select('*', { count: 'exact', head: true }),
            'ADMIN_STATS_TICKETS'
          ),
          safeQuery<{ count: number }>(
            supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['new', 'waiting', 'waiting_user']),
            'ADMIN_STATS_WAITING_TICKETS'
          ),
          safeQuery<{ count: number }>(
            supabase.from('chatbot_queries').select('*', { count: 'exact', head: true }),
            'ADMIN_STATS_QUERIES'
          ),
          safeQuery<{ count: number }>(
            supabase.from('apogee_agencies').select('*', { count: 'exact', head: true }),
            'ADMIN_STATS_AGENCIES'
          ),
        ]);

        setStats({
          totalUsers: (usersResult.data as any)?.count || 0,
          totalBlocks: (blocksResult.data as any)?.count || 0,
          totalDocuments: (documentsResult.data as any)?.count || 0,
          totalTickets: (ticketsResult.data as any)?.count || 0,
          waitingTickets: (waitingResult.data as any)?.count || 0,
          chatbotQueries: (queriesResult.data as any)?.count || 0,
          agencies: (agenciesResult.data as any)?.count || 0,
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
