/**
 * Détails d'un ticket support - Phase 3
 * Affiche infos complètes + actions (statut, priorité, escalade)
 * P2: Ajout historique des actions
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, User, ArrowUpCircle, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SupportTicket } from '@/hooks/use-admin-support';
import { RatingStars } from '@/components/RatingStars';
import { TicketStatusBadge } from './TicketStatusBadge';
import { HeatPriorityBadge } from '@/components/support/HeatPriorityBadge';
import { HeatPrioritySelector } from '@/components/support/HeatPrioritySelector';
import { ServiceBadge } from '@/components/tickets/ServiceBadge';
import { TicketActionHistory } from './TicketActionHistory';
import {
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  type TicketStatus,
} from '@/services/supportService';

interface SupportUser {
  id: string;
  first_name: string;
  last_name: string;
}

interface TicketDetailsProps {
  ticket: SupportTicket;
  onResolve: () => void;
  onReopen: () => void;
  onStatusChange?: (status: TicketStatus) => void;
  onPriorityChange?: (priority: number) => void;
  onEscalate?: () => void;
  supportUsers?: SupportUser[];
}

export function TicketDetails({
  ticket,
  onResolve,
  onReopen,
  onStatusChange,
  onPriorityChange,
  onEscalate,
  supportUsers = [],
}: TicketDetailsProps) {
  const canEscalate = ticket.support_level && ticket.support_level < 3;
  const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';
  
  // P1-04: Afficher le nom de l'agent au lieu de l'UUID tronqué
  const getAgentName = (userId: string | null | undefined): string => {
    if (!userId) return '';
    const agent = supportUsers.find(u => u.id === userId);
    return agent ? `${agent.first_name} ${agent.last_name}` : userId.slice(0, 8) + '...';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            <span className="truncate max-w-[200px]">{ticket.subject || `Ticket #${ticket.id.slice(0, 8)}`}</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Bouton Escalade */}
            {canEscalate && !isResolved && onEscalate && (
              <Button onClick={onEscalate} variant="outline" size="sm" className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30">
                <ArrowUpCircle className="w-4 h-4 mr-1" />
                Escalader N{(ticket.support_level || 1) + 1}
              </Button>
            )}
            
            {/* Bouton Résoudre / Réouvrir */}
            {isResolved ? (
              <Button onClick={onReopen} variant="outline" size="sm">
                Réouvrir
              </Button>
            ) : (
              <Button onClick={onResolve} variant="default" size="sm">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Résoudre
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Badges principaux */}
        <div className="flex flex-wrap items-center gap-2">
          <TicketStatusBadge status={ticket.status} />
          <HeatPriorityBadge priority={ticket.heat_priority} />
          <ServiceBadge service={ticket.service} />
          {ticket.support_level && (
            <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700">
              Niveau {ticket.support_level}
            </Badge>
          )}
          {ticket.category && (
            <Badge variant="outline">{ticket.category}</Badge>
          )}
        </div>

        {/* Contrôles de statut et priorité */}
        {!isResolved && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
            {/* Changement de statut */}
            {onStatusChange && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Changer le statut
                </label>
                <Select
                  value={ticket.status}
                  onValueChange={(value) => onStatusChange(value as TicketStatus)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Changement de priorité */}
            {onPriorityChange && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Changer la priorité (0-12)
                </label>
                <HeatPrioritySelector
                  value={ticket.heat_priority}
                  onValueChange={onPriorityChange}
                />
              </div>
            )}
          </div>
        )}

        {/* Informations détaillées */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Créé le</p>
            <p className="font-medium">
              {format(new Date(ticket.created_at), "d MMMM yyyy 'à' HH:mm", {
                locale: fr,
              })}
            </p>
          </div>
          {ticket.assigned_to && (
            <div>
              <p className="text-muted-foreground">Assigné à</p>
              <p className="font-medium">{getAgentName(ticket.assigned_to)}</p>
            </div>
          )}
          {ticket.resolved_at && (
            <div>
              <p className="text-muted-foreground">Résolu le</p>
              <p className="font-medium">
                {format(new Date(ticket.resolved_at), "d MMMM yyyy 'à' HH:mm", {
                  locale: fr,
                })}
              </p>
            </div>
          )}
        </div>

        {/* P2: Historique des actions */}
        <TicketActionHistory ticketId={ticket.id} />

        {/* Historique d'escalade */}
        {ticket.escalation_history && Array.isArray(ticket.escalation_history) && ticket.escalation_history.length > 0 && (
          <div className="border-t pt-4">
            <Accordion type="single" collapsible>
              <AccordionItem value="escalation">
                <AccordionTrigger className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Historique d'escalade ({ticket.escalation_history.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {ticket.escalation_history.map((entry: any, idx: number) => (
                      <div key={idx} className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded text-sm">
                        <p className="font-medium">
                          N{entry.from_level} → N{entry.to_level}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.reason} • {format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}

        {/* Évaluation */}
        {ticket.rating && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Évaluation</p>
            <RatingStars rating={ticket.rating} size="lg" onRatingChange={() => {}} />
            {ticket.rating_comment && (
              <p className="text-sm text-muted-foreground mt-2">
                {ticket.rating_comment}
              </p>
            )}
          </div>
        )}

        {/* Historique chatbot */}
        {ticket.chatbot_conversation &&
          Array.isArray(ticket.chatbot_conversation) &&
          ticket.chatbot_conversation.length > 0 && (
            <div className="border-t pt-4">
              <Accordion type="single" collapsible>
                <AccordionItem value="conversation">
                  <AccordionTrigger className="text-sm font-medium">
                    Historique Chatbot ({ticket.chatbot_conversation.length} messages)
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {ticket.chatbot_conversation.map(
                        (msg: any, idx: number) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg ${
                              msg.role === 'user'
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            <p className="text-xs font-medium mb-1">
                              {msg.role === 'user' ? 'Utilisateur' : 'Mme MICHU'}
                            </p>
                            <p className="text-sm opacity-80">{msg.content}</p>
                          </div>
                        )
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
