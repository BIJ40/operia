/**
 * SupportTabContent - Contenu de l'onglet "Support"
 * Reprend le contenu de SupportIndex
 */

import { useState } from 'react';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { useCombinedUserTickets } from '@/hooks/use-user-project-tickets';
import { useUserProjectUnreadCount } from '@/hooks/use-project-ticket-notifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SimplifiedSupportChat } from '@/components/support/SimplifiedSupportChat';
import { CreateProjectTicketDialog } from '@/components/support/CreateProjectTicketDialog';
import { HeatPriorityBadge } from '@/components/support/HeatPriorityBadge';
import { ProjectTicketDetailPanel } from '@/components/support/ProjectTicketDetailPanel';
import { 
  MessageSquare, 
  FileText, 
  PlusCircle,
  Clock,
  CheckCircle2,
  Plus,
  Loader2,
  MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

export default function SupportTabContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { tickets: combinedTickets, isLoading: combinedLoading } = useCombinedUserTickets();
  const { unreadCount: totalUnreadCount } = useUserProjectUnreadCount();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProjectTicketId, setSelectedProjectTicketId] = useState<string | null>(null);

  const handleTicketCreated = (_ticketId: string) => {
    queryClient.invalidateQueries({ queryKey: ['user-project-tickets'] });
    queryClient.invalidateQueries({ queryKey: ['combined-user-tickets'] });
  };

  if (selectedProjectTicketId) {
    return (
      <div className="py-3 px-2 sm:px-4">
        <ProjectTicketDetailPanel
          ticketId={selectedProjectTicketId}
          onBack={() => setSelectedProjectTicketId(null)}
        />
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6">
      {/* Warm Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-warm-blue to-warm-teal bg-clip-text text-transparent">
          Support
        </h2>
        <p className="text-muted-foreground mt-1">
          Besoin d'aide ? Trouvez des réponses ou contactez notre équipe
        </p>
      </div>

      {/* 3 Column Layout - Warm Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
        {/* Column 1: Créer un ticket - Warm Blue accent */}
        <Card className="lg:col-span-1 rounded-2xl border-l-4 border-l-warm-blue/60 bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-xl bg-warm-blue/15 flex items-center justify-center">
                <PlusCircle className="w-5 h-5 text-warm-blue" />
              </div>
              Créer un ticket
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Décrivez votre problème, notre équipe vous répondra
            </p>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas trouvé de réponse via le Chat IA ?
              Créez un ticket pour contacter notre équipe support.
            </p>
            
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="w-full gap-2 rounded-xl bg-warm-blue/90 hover:bg-warm-blue text-white shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Ouvrir un ticket
            </Button>
            
            <div className="pt-4 border-t border-border/40">
              <p className="text-xs text-muted-foreground mb-2">
                Nos engagements :
              </p>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-warm-green/15 flex items-center justify-center">
                    <Clock className="w-2.5 h-2.5 text-warm-green" />
                  </div>
                  Réponse sous 24h ouvrées
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-warm-green/15 flex items-center justify-center">
                    <CheckCircle2 className="w-2.5 h-2.5 text-warm-green" />
                  </div>
                  Suivi en temps réel
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Chat IA - Warm Orange accent */}
        <Card className="lg:col-span-1 flex flex-col rounded-2xl border-l-4 border-l-warm-orange/60 bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow min-h-[520px]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-xl bg-warm-orange/15 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-warm-orange" />
              </div>
              Chat IA
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Répondez aux questions, puis posez votre question
            </p>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <SimplifiedSupportChat
              onTicketCreated={handleTicketCreated}
              onChatClosed={() => {}}
              className="h-full max-h-[420px]"
            />
          </CardContent>
        </Card>

        {/* Column 3: Mes Demandes - Warm Purple accent */}
        <Card className="lg:col-span-1 rounded-2xl border-l-4 border-l-warm-purple/60 bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow flex flex-col min-h-[520px]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-xl bg-warm-purple/15 flex items-center justify-center">
                <FileText className="w-5 h-5 text-warm-purple" />
              </div>
              Mes Demandes
              {totalUnreadCount > 0 && (
                <Badge variant="destructive" className="text-xs animate-pulse rounded-full px-2">
                  {totalUnreadCount} nouveau{totalUnreadCount > 1 ? 'x' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-full max-h-[420px] pr-4">
              {combinedLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-warm-purple" />
                </div>
              ) : combinedTickets.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <FileText className="w-7 h-7 opacity-40" />
                  </div>
                  <p className="text-sm">Aucune demande en cours</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 rounded-xl border-warm-blue/40 text-warm-blue hover:bg-warm-blue/10"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Créer un ticket
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {combinedTickets.map((ticket) => {
                    const hasUnread = ticket.unread_exchanges_count > 0;
                    
                    return (
                    <button
                      key={`${ticket.ticketType}-${ticket.id}`}
                      onClick={() => setSelectedProjectTicketId(ticket.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border border-border/50 bg-card/50 hover:border-warm-purple/40 hover:bg-muted/30 transition-all",
                        hasUnread && "animate-pulse ring-2 ring-destructive ring-offset-1 bg-destructive/5"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium text-sm truncate flex-1 flex items-center gap-1">
                          {ticket.subject}
                          {ticket.unread_exchanges_count > 0 && (
                            <Badge variant="secondary" className="text-xs gap-0.5 ml-1 rounded-full bg-warm-pink/15 text-warm-pink">
                              <MessageCircle className="h-3 w-3" />
                              {ticket.unread_exchanges_count}
                            </Badge>
                          )}
                        </p>
                        <Badge 
                          style={{ 
                            backgroundColor: ticket.statusColor ? `${ticket.statusColor}20` : undefined,
                            color: ticket.statusColor || undefined
                          }}
                          variant="secondary"
                          className="rounded-full"
                        >
                          {ticket.statusLabel || ticket.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <HeatPriorityBadge priority={ticket.heat_priority} size="sm" />
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(ticket.created_at), 'dd MMM', { locale: fr })}
                        </span>
                      </div>
                    </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <CreateProjectTicketDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onTicketCreated={handleTicketCreated}
      />
    </div>
  );
}
