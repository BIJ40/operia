import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSupportNotifications() {
  const { isSupport, isAdmin, user } = useAuth();
  const [hasNewTickets, setHasNewTickets] = useState(false);
  const [newTicketsCount, setNewTicketsCount] = useState(0);

  useEffect(() => {
    // Le hook fonctionne pour les admins ET les support
    if ((!isSupport && !isAdmin) || !user) return;

    // Charger le nombre de tickets en attente initial
    const loadWaitingTickets = async () => {
      const { count, error } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting');

      if (!error) {
        const safeCount = count ?? 0;
        setNewTicketsCount(safeCount);
        setHasNewTickets(safeCount > 0);
      }
    };

    loadWaitingTickets();

    // Écouter les nouveaux tickets en temps réel
    const channel = supabase
      .channel('support-new-tickets')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          // Recharger le compte
          loadWaitingTickets();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          // Recharger le compte si le statut change
          loadWaitingTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSupport, isAdmin, user]);

  return { hasNewTickets, newTicketsCount };
}
