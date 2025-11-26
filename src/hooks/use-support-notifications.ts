import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSupportNotifications() {
  const { isSupport, isAdmin, user } = useAuth();
  const [hasNewTickets, setHasNewTickets] = useState(false);
  const [newTicketsCount, setNewTicketsCount] = useState(0);
  const [assignedToMeCount, setAssignedToMeCount] = useState(0);

  useEffect(() => {
    // Le hook fonctionne pour les admins ET les support
    if ((!isSupport && !isAdmin) || !user) return;

    // Charger le nombre de tickets en attente et assignés
    const loadTickets = async () => {
      // Tickets en attente
      const { count: waitingCount, error: waitingError } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting');

      // Tickets assignés à moi (en cours)
      const { count: assignedCount, error: assignedError } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('status', 'in_progress');

      if (!waitingError) {
        const safeCount = waitingCount ?? 0;
        setNewTicketsCount(safeCount);
        setHasNewTickets(safeCount > 0);
      }

      if (!assignedError) {
        setAssignedToMeCount(assignedCount ?? 0);
      }
    };

    loadTickets();

    // Écouter les changements de tickets en temps réel
    const channel = supabase
      .channel('support-tickets-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          loadTickets();
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
          loadTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSupport, isAdmin, user]);

  return { hasNewTickets, newTicketsCount, assignedToMeCount };
}
