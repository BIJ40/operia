/**
 * Widget Derniers Tickets - V3
 * Affiche uniquement les tickets projet (apogee_tickets)
 * support_tickets supprimé
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { MessageSquare, ChevronRight, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TicketItem {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  unread_exchanges_count: number;
  has_active_exchange: boolean;
  statusLabel?: string;
  statusColor?: string | null;
}

export function RecentTicketsWidget() {
  const { user } = useAuthCore();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['widget-recent-tickets-v3', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // V3: Fetch only project tickets where user is initiator
      const { data: projectTickets } = await supabase
        .from('apogee_tickets')
        .select(`
          id, 
          element_concerne, 
          kanban_status, 
          created_at,
          support_initiator_user_id,
          apogee_ticket_statuses(id, label, color)
        `)
        .eq('support_initiator_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!projectTickets?.length) return [];

      // Get unread exchanges for project tickets
      const projectTicketIds = projectTickets.map(t => t.id);
      let exchangeCounts: Record<string, number> = {};
      
      const { data: exchanges } = await supabase
        .from('apogee_ticket_support_exchanges')
        .select('ticket_id')
        .in('ticket_id', projectTicketIds)
        .neq('sender_user_id', user.id)
        .is('read_at', null);
      
      for (const ex of exchanges || []) {
        exchangeCounts[ex.ticket_id] = (exchangeCounts[ex.ticket_id] || 0) + 1;
      }

      // Format tickets
      return projectTickets.map(t => ({
        id: t.id,
        subject: t.element_concerne,
        status: t.kanban_status,
        created_at: t.created_at,
        unread_exchanges_count: exchangeCounts[t.id] || 0,
        has_active_exchange: (exchangeCounts[t.id] || 0) > 0,
        statusLabel: t.apogee_ticket_statuses?.label,
        statusColor: t.apogee_ticket_statuses?.color,
      })) as TicketItem[];
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  if (!tickets?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-muted-foreground text-sm">
        <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
        <p>Aucun ticket récent</p>
      </div>
    );
  }

  const getStatusColor = (ticket: TicketItem) => {
    if (ticket.statusColor) {
      return { backgroundColor: `${ticket.statusColor}20`, color: ticket.statusColor };
    }
    return { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' };
  };

  return (
    <div className="space-y-2">
      {tickets.map((ticket) => (
        <Link
          key={ticket.id}
          to="/support"
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors relative",
            ticket.has_active_exchange && "animate-pulse ring-1 ring-primary ring-offset-1"
          )}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm font-medium truncate">{ticket.subject}</p>
              {ticket.unread_exchanges_count > 0 && (
                <Badge variant="secondary" className="text-xs gap-0.5">
                  <MessageCircle className="h-3 w-3" />
                  {ticket.unread_exchanges_count}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: fr })}
            </p>
          </div>
          <Badge style={getStatusColor(ticket)} variant="secondary">
            {ticket.statusLabel || ticket.status}
          </Badge>
        </Link>
      ))}
      <Link
        to="/support"
        className="flex items-center justify-center gap-1 text-sm text-primary hover:underline pt-2"
      >
        Voir tous les tickets
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
