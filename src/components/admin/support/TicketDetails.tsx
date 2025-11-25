import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SupportTicket } from '@/hooks/use-admin-support';
import { RatingStars } from '@/components/RatingStars';

interface TicketDetailsProps {
  ticket: SupportTicket;
  onResolve: () => void;
  onReopen: () => void;
}

export function TicketDetails({ ticket, onResolve, onReopen }: TicketDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {ticket.user_pseudo}
          </CardTitle>
          {ticket.status === 'resolved' ? (
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
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Statut</p>
            <Badge variant="secondary">{ticket.status}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Priorité</p>
            <Badge variant="secondary">{ticket.priority}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Créé le</p>
            <p>
              {format(new Date(ticket.created_at), "d MMMM 'à' HH:mm", {
                locale: fr,
              })}
            </p>
          </div>
          {ticket.resolved_at && (
            <div>
              <p className="text-muted-foreground">Résolu le</p>
              <p>
                {format(new Date(ticket.resolved_at), "d MMMM 'à' HH:mm", {
                  locale: fr,
                })}
              </p>
            </div>
          )}
        </div>

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

        {ticket.chatbot_conversation &&
          Array.isArray(ticket.chatbot_conversation) &&
          ticket.chatbot_conversation.length > 0 && (
            <div className="border-t pt-4">
              <Accordion type="single" collapsible>
                <AccordionItem value="conversation">
                  <AccordionTrigger className="text-sm font-medium">
                    Historique Chatbot ({ticket.chatbot_conversation.length}{' '}
                    messages)
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {ticket.chatbot_conversation.map(
                        (msg: any, idx: number) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg ${
                              msg.role === 'user'
                                ? 'bg-blue-50 text-blue-900'
                                : 'bg-gray-50 text-gray-900'
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
