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

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalBlocks: 0,
    totalDocuments: 0,
    totalTickets: 0,
    waitingTickets: 0,
    chatbotQueries: 0,
    agencies: 0,
    isLoading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Récupérer toutes les stats en parallèle
        const [
          usersCount,
          blocksCount,
          documentsCount,
          ticketsCount,
          waitingCount,
          queriesCount,
          agenciesCount,
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('blocks').select('*', { count: 'exact', head: true }),
          supabase.from('documents').select('*', { count: 'exact', head: true }),
          supabase.from('support_tickets').select('*', { count: 'exact', head: true }),
          // Compter les tickets en attente (nouveaux et waiting_user, + legacy 'waiting')
          supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['new', 'waiting', 'waiting_user']),
          supabase.from('chatbot_queries').select('*', { count: 'exact', head: true }),
          supabase.from('apogee_agencies').select('*', { count: 'exact', head: true }),
        ]);

        setStats({
          totalUsers: usersCount.count || 0,
          totalBlocks: blocksCount.count || 0,
          totalDocuments: documentsCount.count || 0,
          totalTickets: ticketsCount.count || 0,
          waitingTickets: waitingCount.count || 0,
          chatbotQueries: queriesCount.count || 0,
          agencies: agenciesCount.count || 0,
          isLoading: false,
        });
      } catch (error) {
        logError('Erreur lors de la récupération des stats:', error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();
  }, []);

  return stats;
}
