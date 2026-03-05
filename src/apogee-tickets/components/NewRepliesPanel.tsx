/**
 * NewRepliesPanel - Panel affichant les tickets ayant des réponses non lues
 * Avec animation clignotante pour attirer l'attention
 */

import { useMemo } from 'react';
import { useApogeeTickets } from '../hooks/useApogeeTickets';
import { useTicketsWithNewReplies } from '../hooks/useTicketsWithNewReplies';
import { MessageCircle, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ApogeeTicket } from '../types';

interface NewRepliesPanelProps {
  onTicketClick: (ticket: ApogeeTicket) => void;
}

export function NewRepliesPanel({ onTicketClick }: NewRepliesPanelProps) {
  const { tickets, statuses, modules, isLoading: isLoadingTickets } = useApogeeTickets();
  const { data: repliesData = [], isLoading: isLoadingReplies } = useTicketsWithNewReplies();

  const ticketsWithReplies = useMemo(() => {
    if (!repliesData.length) return [];
    
    const replyMap = new Map(repliesData.map(r => [r.ticketId, r]));
    
    return tickets
      .filter(t => replyMap.has(t.id))
      .map(t => ({
        ticket: t,
        reply: replyMap.get(t.id)!,
      }))
      .sort((a, b) => 
        new Date(b.reply.lastReplyAt).getTime() - new Date(a.reply.lastReplyAt).getTime()
      );
  }, [tickets, repliesData]);

  const getStatusLabel = (statusId: string) => {
    return statuses.find(s => s.id === statusId)?.label || statusId;
  };

  const getStatusColor = (statusId: string) => {
    return statuses.find(s => s.id === statusId)?.color || 'gray';
  };

  const getModuleLabel = (moduleId: string | null) => {
    if (!moduleId) return null;
    return modules.find(m => m.id === moduleId)?.label || moduleId;
  };

  if (isLoadingTickets || isLoadingReplies) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  if (ticketsWithReplies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
          <MessageCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Aucune nouvelle réponse</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Tous les échanges ont été lus. 👍
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
          <MessageCircle className="w-4 h-4" />
          <span className="font-medium text-sm">
            {ticketsWithReplies.length} ticket{ticketsWithReplies.length > 1 ? 's' : ''} avec réponse{ticketsWithReplies.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Liste */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/30">
          {ticketsWithReplies.map(({ ticket, reply }) => {
            const statusColor = getStatusColor(ticket.kanban_status);

            return (
              <button
                key={ticket.id}
                onClick={() => onTicketClick(ticket)}
                className={cn(
                  "w-full text-left p-4 hover:bg-accent/30 transition-colors group",
                  "animate-reply-blink"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Indicateur réponse */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 relative">
                    <MessageCircle className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-1">
                      {reply.unreadCount}
                    </span>
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        #{ticket.ticket_number}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: `${statusColor}20`,
                          color: statusColor
                        }}
                      >
                        {getStatusLabel(ticket.kanban_status)}
                      </Badge>
                      {ticket.module && (
                        <Badge variant="outline" className="text-xs">
                          {getModuleLabel(ticket.module)}
                        </Badge>
                      )}
                    </div>

                    <h4 className="font-medium text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {ticket.element_concerne}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3 text-blue-500" />
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {reply.unreadCount} réponse{reply.unreadCount > 1 ? 's' : ''} non lue{reply.unreadCount > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {formatDistanceToNow(new Date(reply.lastReplyAt), { locale: fr, addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
