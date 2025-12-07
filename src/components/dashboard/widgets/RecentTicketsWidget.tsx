/**
 * Widget Derniers Tickets Support
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function RecentTicketsWidget() {
  const { user } = useAuth();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['widget-recent-tickets', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('support_tickets')
        .select('id, subject, status, priority, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-2">
      {tickets.map((ticket) => (
        <Link
          key={ticket.id}
          to={`/support/mes-demandes/${ticket.id}`}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{ticket.subject}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: fr })}
            </p>
          </div>
          <Badge className={getStatusColor(ticket.status)} variant="secondary">
            {ticket.status}
          </Badge>
        </Link>
      ))}
      <Link
        to="/support/mes-demandes"
        className="flex items-center justify-center gap-1 text-sm text-primary hover:underline pt-2"
      >
        Voir tous les tickets
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
