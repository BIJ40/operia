import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminTickets } from '@/hooks/use-admin-tickets';
import { Ticket } from '@/hooks/use-user-tickets';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TicketCategoryBadge } from '@/components/tickets/TicketCategoryBadge';
import { ServiceBadge } from '@/components/tickets/ServiceBadge';
import { Loader2, Send, Download, AlertCircle, Clock, CheckCircle2, User, LayoutGrid, List, Moon, Sun, Bell, BellOff } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminSupportTickets() {
  const { canManageTickets, user } = useAuth();
  const navigate = useNavigate();
  const {
    tickets,
    selectedTicket,
    setSelectedTicket,
    attachments,
    messages,
    isLoading,
    filters,
    setFilters,
    updateTicketStatus,
    updateTicketPriority,
    assignTicket,
    addSupportMessage,
    downloadAttachment,
    reopenTicket,
    getStats,
  } = useAdminTickets();

  const [newMessage, setNewMessage] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);

  const getCardClassName = (status: string) => {
    const isActive = filters.status === status;
    return `cursor-pointer transition-all ${
      isActive 
        ? 'shadow-xl ring-2 ring-primary scale-105' 
        : 'hover:shadow-lg'
    }`;
  };

  const hasActiveFilters = () => {
    return filters.status !== 'all' || 
           filters.source !== 'all' || 
           filters.category !== 'all' || 
           filters.agency !== 'all' ||
           filters.priority !== 'all' ||
           filters.service !== 'all';
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      source: 'all',
      category: 'all',
      agency: 'all',
      priority: 'all',
      service: 'all',
    });
  };

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
    if (!canManageTickets()) {
      navigate('/');
    }
  }, [canManageTickets, navigate]);

  const stats = getStats();

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim() || !user) return;
    
    await addSupportMessage(selectedTicket.id, newMessage, user.id);
    setNewMessage('');
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      waiting: { label: 'En attente', variant: 'secondary', icon: Clock },
      in_progress: { label: 'En cours', variant: 'default', icon: AlertCircle },
      resolved: { label: 'Résolu', variant: 'outline', icon: CheckCircle2 },
      unresolved: { label: 'Non résolu', variant: 'destructive', icon: AlertCircle },
    };
    const config = variants[status as keyof typeof variants] || variants.waiting;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800 border-blue-300',
      normal: 'bg-gray-100 text-gray-800 border-gray-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      urgent: 'bg-red-100 text-red-800 border-red-300',
    };
    const labels = {
      low: 'Faible',
      normal: 'Normal',
      high: 'Élevée',
      urgent: 'Urgente',
    };
    return (
      <Badge variant="outline" className={colors[priority as keyof typeof colors]}>
        {labels[priority as keyof typeof labels] || priority}
      </Badge>
    );
  };

  const getDemandTypeBadge = (ticket: Ticket) => {
    if (ticket.is_live_chat && ticket.status === 'waiting') {
      return (
        <Badge className="bg-green-500 text-white animate-pulse">
          🟢 Chat en cours
        </Badge>
      );
    }
    if (ticket.escalated_from_chat) {
      return (
        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
          🔄 Ex-Demande
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
        🎫 Ticket
      </Badge>
    );
  };

  if (!canManageTickets()) {
    return null;
  }

  return (
    <Layout showHeader showSidebar sidebarType="admin">
      <div className={darkMode ? 'dark' : ''}>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
                Support & Tickets
              </h1>
              <p className="text-muted-foreground">Console unifiée de gestion des demandes</p>
            </div>
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

          {/* Stats Dashboard */}
          {hasActiveFilters() && (
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                Réinitialiser les filtres
              </Button>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-5">
            <Card 
              className={getCardClassName('all')}
              onClick={() => setFilters({ ...filters, status: 'all' })}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card 
              className={getCardClassName('waiting')}
              onClick={() => setFilters({ ...filters, status: 'waiting' })}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">En attente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.waiting}</div>
              </CardContent>
            </Card>
            <Card 
              className={getCardClassName('in_progress')}
              onClick={() => setFilters({ ...filters, status: 'in_progress' })}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">En cours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
              </CardContent>
            </Card>
            <Card 
              className={getCardClassName('resolved')}
              onClick={() => setFilters({ ...filters, status: 'resolved' })}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Résolus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
              </CardContent>
            </Card>
            <Card 
              className={getCardClassName('unresolved')}
              onClick={() => setFilters({ ...filters, status: 'unresolved' })}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Non résolus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.unresolved}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Tickets List */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Demandes</CardTitle>
                <CardDescription>Chats en cours et tickets</CardDescription>
                
                {/* Filters */}
                <div className="space-y-2 pt-4">
                  <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="waiting">En attente</SelectItem>
                      <SelectItem value="in_progress">En cours</SelectItem>
                      <SelectItem value="resolved">Résolu</SelectItem>
                      <SelectItem value="unresolved">Non résolu</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="improvement">Amélioration</SelectItem>
                      <SelectItem value="blocking">Blocage</SelectItem>
                      <SelectItem value="question">Question</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>

                   <Select value={filters.source} onValueChange={(v) => setFilters({ ...filters, source: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type de demande" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="all">Tous les types</SelectItem>
                      <SelectItem value="live_chat">🟢 Chats en cours</SelectItem>
                      <SelectItem value="escalated">🔄 Ex-Demandes</SelectItem>
                      <SelectItem value="portal">🎫 Tickets</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filters.priority} onValueChange={(v) => setFilters({ ...filters, priority: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Degré d'urgence" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="all">Tous les niveaux</SelectItem>
                      <SelectItem value="low">🟢 Faible</SelectItem>
                      <SelectItem value="normal">🔵 Normal</SelectItem>
                      <SelectItem value="high">🟠 Élevé</SelectItem>
                      <SelectItem value="urgent">🔴 Urgent</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filters.service} onValueChange={(v) => setFilters({ ...filters, service: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Service" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="all">Tous les services</SelectItem>
                      <SelectItem value="apogee">🖥️ Apogée</SelectItem>
                      <SelectItem value="helpconfort">🏠 HelpConfort</SelectItem>
                      <SelectItem value="apporteurs">🤝 Apporteurs</SelectItem>
                      <SelectItem value="conseil">💡 Conseil</SelectItem>
                      <SelectItem value="autre">❓ Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : tickets.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Aucune demande</p>
                  ) : (
                    <div className="space-y-2">
                      {tickets.map((ticket) => (
                        <Card
                          key={ticket.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedTicket?.id === ticket.id ? 'border-primary border-2' : ''
                          }`}
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{ticket.subject || 'Sans sujet'}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {ticket.user_pseudo}
                                </p>
                              </div>
                              {getStatusBadge(ticket.status)}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {getDemandTypeBadge(ticket)}
                              <ServiceBadge service={ticket.service} />
                              {ticket.category && <TicketCategoryBadge category={ticket.category} />}
                              {getPriorityBadge(ticket.priority)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(ticket.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                            </p>
                            {ticket.agency_slug && (
                              <Badge variant="outline" className="mt-2">
                                {ticket.agency_slug}
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Ticket Detail */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>
                  {selectedTicket ? 'Détail de la demande' : 'Sélectionnez une demande'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedTicket ? (
                  <p className="text-center text-muted-foreground py-8">
                    Sélectionnez une demande dans la liste pour voir les détails
                  </p>
                ) : (
                  <Tabs defaultValue="conversation">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="conversation">Conversation</TabsTrigger>
                      <TabsTrigger value="details">Détails</TabsTrigger>
                      <TabsTrigger value="attachments">
                        Pièces jointes ({attachments.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="conversation" className="space-y-4">
                      {/* Controls */}
                      <div className="flex gap-2 flex-wrap items-center">
                        <Select
                          value={selectedTicket.status}
                          onValueChange={(v) => updateTicketStatus(selectedTicket.id, v)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="waiting">En attente</SelectItem>
                            <SelectItem value="in_progress">En cours</SelectItem>
                            <SelectItem value="resolved">Résolu</SelectItem>
                            <SelectItem value="unresolved">Non résolu</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select
                          value={selectedTicket.priority}
                          onValueChange={(v) => updateTicketPriority(selectedTicket.id, v)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Faible</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">Élevée</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>

                        {(selectedTicket.status === 'resolved' || selectedTicket.status === 'unresolved') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reopenTicket(selectedTicket.id)}
                            className="ml-auto"
                          >
                            Réouvrir le ticket
                          </Button>
                        )}
                      </div>

                      <Separator />

                      {/* Messages */}
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.is_from_support ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg p-3 ${
                                  msg.is_from_support
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      {/* New Message Input */}
                      {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'unresolved' && (
                        <div className="flex gap-2">
                          <Textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Répondre à la demande..."
                            className="flex-1"
                            rows={3}
                          />
                          <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {(selectedTicket.status === 'resolved' || selectedTicket.status === 'unresolved') && (
                        <div className="bg-muted p-4 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground mb-2">
                            Ce ticket est {selectedTicket.status === 'resolved' ? 'résolu' : 'non résolu'}.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reopenTicket(selectedTicket.id)}
                          >
                            Réouvrir pour continuer la conversation
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="details" className="space-y-4">
                      <div className="grid gap-4">
                        <div>
                          <label className="text-sm font-medium">Sujet</label>
                          <p className="text-sm text-muted-foreground">{selectedTicket.subject || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Utilisateur</label>
                          <p className="text-sm text-muted-foreground">{selectedTicket.user_pseudo}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Agence</label>
                          <p className="text-sm text-muted-foreground">{selectedTicket.agency_slug || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Type de demande</label>
                          <div className="mt-1">
                            {getDemandTypeBadge(selectedTicket)}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Service</label>
                          <div className="mt-1">
                            <ServiceBadge service={selectedTicket.service} />
                          </div>
                        </div>
                        {selectedTicket.category && (
                          <div>
                            <label className="text-sm font-medium">Catégorie</label>
                            <div className="mt-1">
                              <TicketCategoryBadge category={selectedTicket.category} />
                            </div>
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-medium">Créé le</label>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(selectedTicket.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                          </p>
                        </div>
                        {selectedTicket.resolved_at && (
                          <div>
                            <label className="text-sm font-medium">Résolu le</label>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(selectedTicket.resolved_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="attachments" className="space-y-4">
                      {attachments.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Aucune pièce jointe</p>
                      ) : (
                        <div className="space-y-2">
                          {attachments.map((attachment) => (
                            <Card key={attachment.id} className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{attachment.file_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(attachment.file_size / 1024).toFixed(2)} KB
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadAttachment(attachment)}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
