import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, CheckCircle2, Clock, AlertCircle, Mail, MailOpen } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SupportTicket } from '@/hooks/use-admin-support';
import { ServiceBadge } from '@/components/tickets/ServiceBadge';

interface TicketListProps {
  tickets: SupportTicket[];
  selectedTicket: SupportTicket | null;
  onSelectTicket: (ticket: SupportTicket) => void;
  showResolved?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'waiting':
      return 'bg-yellow-500';
    case 'in_progress':
      return 'bg-blue-500';
    case 'resolved':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'waiting':
      return 'En attente';
    case 'in_progress':
      return 'En cours';
    case 'resolved':
      return 'Résolu';
    default:
      return status;
  }
};

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'high':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'normal':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    default:
      return null;
  }
};

export function TicketList({ tickets, selectedTicket, onSelectTicket, showResolved = false }: TicketListProps) {
  // Séparer les tickets actifs des résolus
  const activeTickets = tickets.filter(t => t.status !== 'resolved');
  const resolvedTickets = tickets.filter(t => t.status === 'resolved');
  
  // Trier: tickets avec réponse non lue en premier
  const sortedActiveTickets = [...activeTickets].sort((a, b) => {
    // Tickets avec réponse support non lue en premier
    if (a.has_unread_support_response && !b.has_unread_support_response) return -1;
    if (!a.has_unread_support_response && b.has_unread_support_response) return 1;
    // Puis par date de création (plus récent en premier)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const displayTickets = showResolved ? resolvedTickets : sortedActiveTickets;

  if (displayTickets.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {showResolved ? 'Aucun ticket clôturé' : 'Aucun ticket actif'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {displayTickets.map((ticket) => (
        <Card
          key={ticket.id}
          className={`cursor-pointer transition-all ${
            selectedTicket?.id === ticket.id
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : ticket.has_unread_support_response
              ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/30 shadow-md'
              : 'hover:bg-accent'
          }`}
          onClick={() => onSelectTicket(ticket)}
        >
          <CardHeader className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-1 min-w-0">
                <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">#{ticket.id.slice(0, 8)}</span>
                  {getPriorityIcon(ticket.priority)}
                  {ticket.has_unread_support_response && (
                    <Badge variant="destructive" className="text-xs flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      Réponse non lue
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs flex items-center gap-2 flex-wrap">
                  {format(new Date(ticket.created_at), "d MMM 'à' HH:mm", { locale: fr })}
                  {ticket.service && <ServiceBadge service={ticket.service} />}
                </CardDescription>
                {ticket.subject && (
                  <p className="text-xs text-muted-foreground truncate">{ticket.subject}</p>
                )}
              </div>
              <Badge
                variant="secondary"
                className={`${getStatusColor(ticket.status)} text-white flex-shrink-0`}
              >
                {getStatusLabel(ticket.status)}
              </Badge>
            </div>
          </CardHeader>
          {ticket.rating !== null && (
            <CardContent className="p-4 pt-0">
              <div className="flex items-center gap-1 text-yellow-500">
                {'★'.repeat(ticket.rating)}
                {'☆'.repeat(5 - ticket.rating)}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
