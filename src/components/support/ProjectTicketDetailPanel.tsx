/**
 * Panel de détail pour un ticket projet (apogee_tickets) côté utilisateur
 * Affiche les détails + échanges support
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TicketSupportExchanges } from '@/apogee-tickets/components/TicketSupportExchanges';
import { ArrowLeft, Bug, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ProjectTicketDetailPanelProps {
  ticketId: string;
  onBack: () => void;
}

export function ProjectTicketDetailPanel({ ticketId, onBack }: ProjectTicketDetailPanelProps) {
  const { data: ticket, isLoading } = useQuery({
    queryKey: ['project-ticket-detail', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_tickets')
        .select(`
          id,
          ticket_number,
          element_concerne,
          description,
          kanban_status,
          heat_priority,
          created_at,
          is_urgent_support,
          apogee_ticket_statuses(id, label, color, is_final)
        `)
        .eq('id', ticketId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Ticket non trouvé
      </div>
    );
  }

  const statusColor = ticket.apogee_ticket_statuses?.color || '#6b7280';
  const statusLabel = ticket.apogee_ticket_statuses?.label || ticket.kanban_status;
  const isFinal = ticket.apogee_ticket_statuses?.is_final || false;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">Ticket #{ticket.ticket_number}</h2>
            <Badge 
              style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
              variant="secondary"
            >
              {statusLabel}
            </Badge>
            {ticket.is_urgent_support && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Urgent
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            Créé {format(new Date(ticket.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
          </p>
        </div>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bug className="w-4 h-4" />
            Détails de la demande
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium">Sujet</p>
            <p className="text-sm text-muted-foreground">{ticket.element_concerne}</p>
          </div>
          {ticket.description && (
            <div>
              <p className="text-sm font-medium">Description</p>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md mt-1 max-h-48 overflow-auto">
                {ticket.description}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exchanges */}
      <TicketSupportExchanges 
        ticketId={ticketId}
        isSupport={false}
        className="min-h-[300px]"
      />
    </div>
  );
}
