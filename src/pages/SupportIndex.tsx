/**
 * Support Index - Page unique du support pour les users
 * 3 sections: Créer un ticket (dialog) | Chat IA | Mes Demandes (inline)
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTickets, Ticket } from '@/hooks/use-user-tickets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getFilteredContexts } from '@/lib/rag-michu';
import { SupportChatCore } from '@/components/support/SupportChatCore';
import { CreateSupportTicketDialog } from '@/components/support/CreateSupportTicketDialog';
import { TicketDetailPanel } from '@/components/support/TicketDetailPanel';
import { ServiceBadge } from '@/components/tickets/ServiceBadge';
import { HeatPriorityBadge } from '@/components/support/HeatPriorityBadge';
import { ROUTES } from '@/config/routes';
import { 
  MessageSquare, 
  FileText, 
  Headset,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function SupportIndex() {
  const { canAccessSupportConsoleUI, globalRole } = useAuth();
  const navigate = useNavigate();
  const { tickets, isLoading: ticketsLoading, loadTickets, setSelectedTicket } = useUserTickets();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTicketView, setSelectedTicketView] = useState<Ticket | null>(null);

  // Get allowed RAG contexts based on user role
  const allowedContexts = getFilteredContexts(globalRole || 'base_user');

  const hasUnreadTickets = tickets.some(t => t.unreadCount && t.unreadCount > 0);

  const handleTicketCreated = (ticketId: string) => {
    loadTickets();
  };

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setSelectedTicketView(ticket);
  };

  const getStatusBadge = (status: string) => {
    const normalized = status === 'waiting' ? 'waiting_user' : status;
    const config: Record<string, { label: string; icon: typeof Clock; className: string }> = {
      new: { label: 'Nouveau', icon: Clock, className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
      in_progress: { label: 'En cours', icon: AlertCircle, className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
      waiting_user: { label: 'Attente réponse', icon: Clock, className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
      resolved: { label: 'Résolu', icon: CheckCircle2, className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      closed: { label: 'Fermé', icon: CheckCircle2, className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
    };
    const { label, icon: Icon, className } = config[normalized] || config.new;
    return (
      <Badge variant="outline" className={`${className} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  // Si un ticket est sélectionné, afficher le détail
  if (selectedTicketView) {
    return (
      <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4">
        <TicketDetailPanel
          ticket={selectedTicketView}
          onBack={() => {
            setSelectedTicketView(null);
            setSelectedTicket(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4">
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            Support
          </h1>
          <p className="text-muted-foreground mt-1">
            Besoin d'aide ? Trouvez des réponses ou contactez notre équipe
          </p>
        </div>
        {canAccessSupportConsoleUI && (
          <Button
            variant="outline"
            onClick={() => navigate(ROUTES.support.console)}
            className="gap-2"
          >
            <Headset className="w-4 h-4" />
            <span className="hidden sm:inline">Console Support</span>
          </Button>
        )}
      </div>

      {/* 3 Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Column 1: Ouvrir un ticket */}
        <Card className="lg:col-span-1 border-l-4 border-l-helpconfort-blue">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PlusCircle className="w-5 h-5 text-primary" />
              Ouvrir un Ticket
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Créez une nouvelle demande de support pour obtenir de l'aide personnalisée de notre équipe.
            </p>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer un ticket
            </Button>
            
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                Nos engagements :
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-primary" />
                  Réponse sous 24h ouvrées
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                  Suivi personnalisé
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Chat IA */}
        <Card className="lg:col-span-1 flex flex-col border-l-4 border-l-helpconfort-orange">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="w-5 h-5 text-helpconfort-orange" />
              Chat IA
            </CardTitle>
            <p className="text-xs text-muted-foreground break-words whitespace-normal">
              Posez vos questions, l'IA vous répond instantanément
            </p>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <SupportChatCore
              initialContext={allowedContexts[0] || 'apogee'}
              onTicketCreated={handleTicketCreated}
              showFAQSuggestions={false}
              className="h-[400px]"
            />
          </CardContent>
        </Card>

        {/* Column 3: Mes Demandes */}
        <Card className="lg:col-span-1 border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-green-600" />
              Mes Demandes
              {hasUnreadTickets && (
                <Badge className="bg-red-500 text-white text-xs">
                  Nouveau
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {ticketsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucune demande en cours</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Créer un ticket
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => handleSelectTicket(ticket)}
                      className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium text-sm truncate flex-1">
                          {ticket.subject}
                        </p>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <ServiceBadge service={ticket.service} />
                        <HeatPriorityBadge priority={ticket.heat_priority} size="sm" />
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(ticket.created_at), 'dd MMM', { locale: fr })}
                        </span>
                      </div>
                      {ticket.unreadCount && ticket.unreadCount > 0 && (
                        <Badge className="mt-2 bg-red-500 text-white text-xs">
                          {ticket.unreadCount} nouveau{ticket.unreadCount > 1 ? 'x' : ''}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Dialog création ticket */}
      <CreateSupportTicketDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onTicketCreated={handleTicketCreated}
      />
    </div>
  );
}
