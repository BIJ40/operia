/**
 * Liste des tickets support
 * Mise à jour Phase 3 : utilise les constantes centralisées de supportService.ts
 * P3#1 : Intégration SLA badges
 * P3#2 : Intégration AI badges
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SupportTicket } from '@/hooks/use-admin-support';
import { ServiceBadge } from '@/components/tickets/ServiceBadge';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketPriorityBadge } from './TicketPriorityBadge';
import { SLABadge, calculateSLAStatus } from '@/components/tickets/SLABadge';
import { AIClassificationBadge } from '@/components/support/AIClassificationBadge';
import { AIIncompleteBadge } from '@/components/support/AIIncompleteBadge';

interface TicketListProps {
  tickets: SupportTicket[];
  selectedTicket: SupportTicket | null;
  onSelectTicket: (ticket: SupportTicket) => void;
  showResolved?: boolean;
}

export function TicketList({ tickets, selectedTicket, onSelectTicket, showResolved = false }: TicketListProps) {
  // Séparer les tickets actifs des résolus/fermés
  // Tickets actifs = new, in_progress, waiting_user
  // Tickets terminés = resolved, closed
  const activeTickets = tickets.filter(t => 
    !['resolved', 'closed'].includes(t.status)
  );
  const resolvedTickets = tickets.filter(t => 
    ['resolved', 'closed'].includes(t.status)
  );
  
  // Trier: tickets avec réponse non lue en premier, puis par date
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
      {displayTickets.map((ticket) => {
        const slaStatus = calculateSLAStatus(ticket.due_at, ticket.status);
        const isLate = slaStatus === 'late';
        
        return (
        <Card
          key={ticket.id}
          className={`cursor-pointer transition-all ${
            selectedTicket?.id === ticket.id
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : isLate
              ? 'border-red-400 bg-red-50 dark:bg-red-950/20 ring-1 ring-red-300'
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
                  {/* Badge de priorité avec les nouvelles valeurs */}
                  <TicketPriorityBadge priority={ticket.priority} size="sm" />
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
                  {/* Badge SLA */}
                  <SLABadge dueAt={ticket.due_at} status={ticket.status} size="sm" />
                  {/* Badge AI P3#2 */}
                  <AIClassificationBadge 
                    isAutoClassified={ticket.auto_classified || false}
                    category={ticket.ai_category}
                    confidence={ticket.ai_confidence}
                    size="sm"
                  />
                  <AIIncompleteBadge isIncomplete={ticket.ai_is_incomplete || false} size="sm" />
                </CardDescription>
                {ticket.subject && (
                  <p className="text-xs text-muted-foreground truncate">{ticket.subject}</p>
                )}
              </div>
              {/* Badge de statut avec les nouvelles valeurs */}
              <TicketStatusBadge status={ticket.status} size="sm" />
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
        );
      })}
    </div>
  );
}
