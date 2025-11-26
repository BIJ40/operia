import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MessageSquare, CheckCircle2, Clock, AlertCircle, LayoutGrid, List, Moon, Sun, Bell, BellOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdminSupport } from '@/hooks/use-admin-support';
import { TicketList } from '@/components/admin/support/TicketList';
import { TicketDetails } from '@/components/admin/support/TicketDetails';
import { SupportChat } from '@/components/admin/support/SupportChat';
import { SatisfactionChart } from '@/components/SatisfactionChart';
import { KanbanView } from '@/components/admin/support/KanbanView';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { TrendingUp } from 'lucide-react';

export default function AdminSupport() {
  const {
    isAdmin,
    user,
    tickets,
    selectedTicket,
    messages,
    newMessage,
    filter,
    isUserTyping,
    messagesEndRef,
    setNewMessage,
    setFilter,
    loadTickets,
    selectTicket,
    sendMessage,
    resolveTicket,
    reopenTicket,
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

  useEffect(() => {
    if (!isAdmin && !user) {
      navigate('/');
      return;
    }
    loadTickets();
  }, [isAdmin, user, navigate]);

  const filteredTickets = tickets.filter((t) => t.status === filter);
  const waitingCount = tickets.filter((t) => t.status === 'waiting').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;

  const stats = {
    totalTickets: tickets.length,
    resolvedCount: tickets.filter((t) => t.status === 'resolved').length,
    resolutionRate:
      tickets.length > 0
        ? Math.round(
            (tickets.filter((t) => t.status === 'resolved').length / tickets.length) * 100
          )
        : 0,
    inProgressCount,
    waitingCount,
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
    <div className={`container mx-auto p-6 space-y-6 ${darkMode ? 'dark' : ''}`}>
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

      {/* Email Notifications Card */}
      <Card className="bg-card/50 border-l-4 border-l-primary py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {emailNotificationsEnabled ? (
              <Bell className="w-4 h-4 text-primary" />
            ) : (
              <BellOff className="w-4 h-4 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">Notifications par email</p>
              <p className="text-xs text-muted-foreground">
                Recevoir un email lors de l'ouverture d'un ticket
              </p>
            </div>
          </div>
          <Switch
            checked={emailNotificationsEnabled}
            onCheckedChange={toggleEmailNotifications}
          />
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <h3 className="text-xs font-medium">Total tickets</h3>
          </div>
          <div className="text-xl font-bold">{stats.totalTickets}</div>
          <p className="text-xs text-muted-foreground">Tous statuts</p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <h3 className="text-xs font-medium">Résolution</h3>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-xl font-bold">{stats.resolutionRate}</span>
            <span className="text-xs text-muted-foreground mb-0.5">%</span>
          </div>
          <p className="text-xs text-muted-foreground">{stats.resolvedCount} résolus</p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            <h3 className="text-xs font-medium">En cours</h3>
          </div>
          <div className="text-xl font-bold">
            {stats.inProgressCount + stats.waitingCount}
          </div>
          <p className="text-xs text-muted-foreground">{stats.waitingCount} en attente</p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <h3 className="text-xs font-medium">Note moyenne</h3>
          </div>
          <div className="text-xl font-bold">{stats.avgRating}</div>
          <p className="text-xs text-muted-foreground">Sur 5</p>
        </Card>
      </div>

      {/* Satisfaction Chart */}
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
              />
              {selectedTicket.status !== 'resolved' && (
                <Card>
                  <SupportChat
                    messages={messages}
                    newMessage={newMessage}
                    isUserTyping={isUserTyping}
                    messagesEndRef={messagesEndRef}
                    onMessageChange={setNewMessage}
                    onSendMessage={sendMessage}
                  />
                </Card>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket List */}
          <div className="lg:col-span-1">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="waiting" className="gap-1 text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Attente ({waitingCount})
                </TabsTrigger>
                <TabsTrigger value="in_progress" className="gap-1 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  En cours ({inProgressCount})
                </TabsTrigger>
                <TabsTrigger value="resolved" className="gap-1 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Résolus
                </TabsTrigger>
              </TabsList>

              <TabsContent value={filter} className="space-y-2 mt-0">
                {filteredTickets.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      Aucun ticket
                    </CardContent>
                  </Card>
                ) : (
                  <TicketList
                    tickets={filteredTickets}
                    selectedTicket={selectedTicket}
                    onSelectTicket={selectTicket}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Chat Interface */}
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
                />
                {selectedTicket.status !== 'resolved' && (
                  <Card>
                    <SupportChat
                      messages={messages}
                      newMessage={newMessage}
                      isUserTyping={isUserTyping}
                      messagesEndRef={messagesEndRef}
                      onMessageChange={setNewMessage}
                      onSendMessage={sendMessage}
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

