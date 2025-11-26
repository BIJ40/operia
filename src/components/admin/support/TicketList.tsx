import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SupportTicket } from '@/hooks/use-admin-support';

interface TicketListProps {
  tickets: SupportTicket[];
  selectedTicket: SupportTicket | null;
  onSelectTicket: (ticket: SupportTicket) => void;
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

export function TicketList({ tickets, selectedTicket, onSelectTicket }: TicketListProps) {
  return (
    <div className="space-y-2">
      {tickets.map((ticket) => (
        <Card
          key={ticket.id}
          className={`cursor-pointer transition-colors ${
            selectedTicket?.id === ticket.id
              ? 'border-primary bg-primary/5'
              : 'hover:bg-accent'
          }`}
          onClick={() => onSelectTicket(ticket)}
        >
          <CardHeader className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-1">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Ticket #{ticket.id.slice(0, 8)}
                  {getPriorityIcon(ticket.priority)}
                </CardTitle>
                <CardDescription className="text-xs">
                  {format(new Date(ticket.created_at), "d MMM 'à' HH:mm", {
                    locale: fr,
                  })}
                </CardDescription>
              </div>
              <Badge
                variant="secondary"
                className={`${getStatusColor(ticket.status)} text-white`}
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
