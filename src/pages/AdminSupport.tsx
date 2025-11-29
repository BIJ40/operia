import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MessageSquare, CheckCircle2, Clock, AlertCircle, LayoutGrid, List, Moon, Sun, Bell, BellOff, TrendingUp, CircleDot, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdminSupport } from '@/hooks/use-admin-support';
import { TicketList } from '@/components/admin/support/TicketList';
import { TicketDetails } from '@/components/admin/support/TicketDetails';
import { SupportChat } from '@/components/admin/support/SupportChat';
import { SatisfactionChart } from '@/components/SatisfactionChart';
import { KanbanView } from '@/components/admin/support/KanbanView';
import { TicketFilters } from '@/components/admin/support/TicketFilters';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { TICKET_STATUS_LABELS, type TicketStatus, type TicketPriority, type TicketService } from '@/services/supportService';

export default function AdminSupport() {
  const {
    isAdmin,
    user,
    tickets,
    filteredTickets,
    selectedTicket,
    messages,
    newMessage,
    filter,
    priorityFilter,
    serviceFilter,
    assignmentFilter,
    isUserTyping,
    isInternalNote,
    messagesEndRef,
    setNewMessage,
    setFilter,
    setPriorityFilter,
    setServiceFilter,
    setAssignmentFilter,
    setIsInternalNote,
    loadTickets,
    selectTicket,
    sendMessage,
    resolveTicket,
    reopenTicket,
    clearFilters,
    updateStatus,
    updatePriority,
    escalateTicketToNextLevel,
  } = useAdminSupport();

  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);

  useEffect(() => {
    const loadEmailPreference = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('email_notifications_enabled')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setEmailNotificationsEnabled(data.email_notifications_enabled ?? true);
      }
    };

    loadEmailPreference();
  }, [user?.id]);

  const toggleEmailNotifications = async () => {
    if (!user?.id) return;

    const newValue = !emailNotificationsEnabled;
    
    const { error } = await supabase
      .from('profiles')
      .update({ email_notifications_enabled: newValue })
      .eq('id', user.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour des préférences");
      return;
    }

    setEmailNotificationsEnabled(newValue);
    toast.success(
      newValue 
        ? "Notifications email activées" 
        : "Notifications email désactivées",
      { duration: 4000 }
    );
  };

  // Reset filter to 'new' on mount (nouveau statut par défaut)
  useEffect(() => {
    setFilter('new');
  }, [setFilter]);

  // Route protégée par RoleGuard dans App.tsx
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Compteurs pour les onglets - utiliser les nouveaux statuts
  const newCount = tickets.filter((t) => t.status === 'new').length;
  const waitingUserCount = tickets.filter((t) => t.status === 'waiting_user' || t.status === 'waiting').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;

  const stats = {
    totalTickets: tickets.length,
    resolvedCount: tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length,
    resolutionRate:
      tickets.length > 0
        ? Math.round(
            (tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length / tickets.length) * 100
          )
        : 0,
    inProgressCount,
    newCount,
    waitingUserCount,
    avgRating:
      tickets.filter((t) => t.rating !== null).length > 0
        ? (
            tickets
              .filter((t) => t.rating !== null)
              .reduce((acc, t) => acc + (t.rating || 0), 0) /
            tickets.filter((t) => t.rating !== null).length
          ).toFixed(1)
        : 'N/A',
  };

  return (
    <div className={`${darkMode ? 'dark' : ''} space-y-6`}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Support Tickets</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDarkMode(!darkMode)}
            className="gap-2"
          >
            {darkMode ? (
              <>
                <Sun className="w-4 h-4" />
                Clair
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" />
                Sombre
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleEmailNotifications}
            className="gap-2"
          >
            {emailNotificationsEnabled ? (
              <>
                <Bell className="w-4 h-4" />
                Emails ON
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4" />
                Emails OFF
              </>
            )}
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="gap-2"
          >
            <List className="w-4 h-4" />
            Liste
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            className="gap-2"
          >
            <LayoutGrid className="w-4 h-4" />
            Kanban
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="group rounded-xl border border-helpconfort-blue/20 p-4
          bg-gradient-to-br from-white to-helpconfort-blue/5
          shadow-sm transition-all duration-300
          hover:to-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
              group-hover:border-helpconfort-blue transition-all">
              <MessageSquare className="w-4 h-4 text-helpconfort-blue" />
            </div>
            <h3 className="text-xs font-medium">Total tickets</h3>
          </div>
          <div className="text-xl font-bold text-helpconfort-blue">{stats.totalTickets}</div>
          <p className="text-xs text-muted-foreground">Tous statuts</p>
        </div>

        <div className="group rounded-xl border border-helpconfort-blue/15 p-4
          bg-gradient-to-b from-helpconfort-blue/5 to-white
          shadow-sm transition-all duration-300
          hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg border-2 border-green-500/30 flex items-center justify-center
              group-hover:border-green-500 transition-all">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <h3 className="text-xs font-medium">Résolution</h3>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-xl font-bold text-green-600">{stats.resolutionRate}</span>
            <span className="text-xs text-muted-foreground mb-0.5">%</span>
          </div>
          <p className="text-xs text-muted-foreground">{stats.resolvedCount} résolus</p>
        </div>

        <div className="group rounded-xl border border-helpconfort-blue/15 p-4 border-l-4 border-l-orange-400
          bg-gradient-to-r from-helpconfort-blue/5 to-white
          shadow-sm transition-all duration-300
          hover:from-helpconfort-blue/15 hover:border-l-orange-500 hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full border-2 border-orange-400/30 flex items-center justify-center
              group-hover:border-orange-500 transition-all">
              <Clock className="w-4 h-4 text-orange-500" />
            </div>
            <h3 className="text-xs font-medium">En cours</h3>
          </div>
          <div className="text-xl font-bold text-orange-600">
            {stats.inProgressCount + stats.newCount}
          </div>
          <p className="text-xs text-muted-foreground">{stats.newCount} nouveaux</p>
        </div>

        <div className="group rounded-xl border border-helpconfort-blue/15 p-4
          bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white
          shadow-sm transition-all duration-300
          hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
              group-hover:border-helpconfort-blue transition-all">
              <MessageSquare className="w-4 h-4 text-helpconfort-blue" />
            </div>
            <h3 className="text-xs font-medium">Note moyenne</h3>
          </div>
          <div className="text-xl font-bold text-helpconfort-blue">{stats.avgRating}</div>
          <p className="text-xs text-muted-foreground">Sur 5</p>
        </div>
      </div>

      <Accordion type="single" collapsible className="mb-4">
        <AccordionItem value="chart" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">
                Graphique d'évolution de satisfaction
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <SatisfactionChart tickets={tickets} period="month" />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {viewMode === 'kanban' ? (
        <div className="space-y-4">
          <KanbanView
            tickets={tickets}
            onSelectTicket={selectTicket}
            onTicketsUpdate={loadTickets}
          />
          
          {selectedTicket && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TicketDetails
                ticket={selectedTicket}
                onResolve={resolveTicket}
                onReopen={reopenTicket}
                onStatusChange={updateStatus.bind(null, selectedTicket.id)}
                onPriorityChange={updatePriority.bind(null, selectedTicket.id)}
                onEscalate={escalateTicketToNextLevel}
              />
              {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                <Card>
                  <SupportChat
                    messages={messages}
                    newMessage={newMessage}
                    isUserTyping={isUserTyping}
                    messagesEndRef={messagesEndRef}
                    isInternalNote={isInternalNote}
                    onMessageChange={setNewMessage}
                    onSendMessage={sendMessage}
                    onInternalNoteChange={setIsInternalNote}
                  />
                </Card>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            {/* Filtres avancés */}
            <TicketFilters
              statusFilter={filter}
              priorityFilter={priorityFilter}
              serviceFilter={serviceFilter}
              assignmentFilter={assignmentFilter}
              onStatusChange={setFilter}
              onPriorityChange={setPriorityFilter}
              onServiceChange={setServiceFilter}
              onAssignmentChange={setAssignmentFilter}
              onClearFilters={clearFilters}
            />
            
            {/* Liste des tickets filtrés */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                <span>{filteredTickets.length} ticket(s)</span>
                {filter !== 'all' && <span>Filtre: {TICKET_STATUS_LABELS[filter] || filter}</span>}
              </div>
              
              {filteredTickets.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Aucun ticket ne correspond aux filtres
                  </CardContent>
                </Card>
              ) : (
                <TicketList
                  tickets={filteredTickets}
                  selectedTicket={selectedTicket}
                  onSelectTicket={selectTicket}
                  showResolved={filter === 'resolved' || filter === 'closed'}
                />
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {!selectedTicket ? (
              <Card className="h-[600px] flex items-center justify-center">
                <CardContent className="text-center text-muted-foreground">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Sélectionnez un ticket pour voir les détails</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <TicketDetails
                  ticket={selectedTicket}
                  onResolve={resolveTicket}
                  onReopen={reopenTicket}
                  onStatusChange={updateStatus.bind(null, selectedTicket.id)}
                  onPriorityChange={updatePriority.bind(null, selectedTicket.id)}
                  onEscalate={escalateTicketToNextLevel}
                />
                {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                  <Card>
                    <SupportChat
                      messages={messages}
                      newMessage={newMessage}
                      isUserTyping={isUserTyping}
                      messagesEndRef={messagesEndRef}
                      isInternalNote={isInternalNote}
                      onMessageChange={setNewMessage}
                      onSendMessage={sendMessage}
                      onInternalNoteChange={setIsInternalNote}
                    />
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
