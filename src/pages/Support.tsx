import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { Loader2, Send, Download, User, Moon, Sun, Bell, BellOff } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EscalateTicketDialog } from '@/components/admin/support/EscalateTicketDialog';
import { SupportLevelBadge } from '@/components/SupportLevelBadge';

export default function Support() {
  const { isSupport, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    tickets,
    selectedTicket,
    setSelectedTicket,
    attachments,
    messages,
    isLoading,
    filters,
    setFilters,
    supportUsers,
    updateTicketStatus,
    updateTicketPriority,
    assignTicket,
    takeTicket,
    addSupportMessage,
    downloadAttachment,
    reopenTicket,
    escalateTicket,
    getStats,
  } = useAdminTickets();

  const [newMessage, setNewMessage] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);

  const formattedSupportUsers = supportUsers.map(u => ({
    id: u.id,
    name: `${u.first_name} ${u.last_name}`,
    first_name: u.first_name,
    last_name: u.last_name,
    support_level: u.support_level,
    service_competencies: u.service_competencies,
  }));

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
           filters.priority !== 'all';
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      source: 'all',
      category: 'all',
      agency: 'all',
      priority: 'all',
    });
  };

  useEffect(() => {
    if (!isSupport && !isAdmin) {
      navigate('/');
    }
  }, [isSupport, isAdmin, navigate]);

  useEffect(() => {
    const state = location.state as { filterStatus?: string } | null;
    if (state?.filterStatus) {
      setFilters(prev => ({ ...prev, status: state.filterStatus as any }));
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  useEffect(() => {
    const loadEmailPreferences = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('email_notifications_enabled')
          .eq('id', user.id)
          .single();

        if (data) {
          setEmailNotificationsEnabled(data.email_notifications_enabled ?? true);
        }
      }
    };

    loadEmailPreferences();
  }, [user]);

  const toggleEmailNotifications = async () => {
    if (!user) return;

    const newValue = !emailNotificationsEnabled;
    const { error } = await supabase
      .from('profiles')
      .update({ email_notifications_enabled: newValue })
      .eq('id', user.id);

    if (error) {
      toast.error('Erreur lors de la mise à jour des préférences');
    } else {
      setEmailNotificationsEnabled(newValue);
      toast.success(newValue ? 'Notifications email activées' : 'Notifications email désactivées');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim() || !user) return;

    await addSupportMessage(selectedTicket.id, newMessage, user.id);
    setNewMessage('');
  };

  const getStatusBadge = (status: string) => {
    // Badges de statut avec les nouvelles valeurs
    const badges: Record<string, JSX.Element> = {
      new: <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">Nouveau</Badge>,
      waiting_user: <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Attente utilisateur</Badge>,
      waiting: <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">En attente</Badge>, // Legacy
      in_progress: <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">En cours</Badge>,
      resolved: <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Résolu</Badge>,
      closed: <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">Fermé</Badge>,
    };
    return badges[status as keyof typeof badges] || null;
  };

  const getPriorityBadge = (priority: string) => {
    const badges = {
      low: <Badge variant="outline" className="text-green-600 border-green-600">🟢 Faible</Badge>,
      normal: <Badge variant="outline" className="text-blue-600 border-blue-600">🔵 Normal</Badge>,
      high: <Badge variant="outline" className="text-orange-600 border-orange-600">🟠 Élevée</Badge>,
      urgent: <Badge variant="outline" className="text-red-600 border-red-600">🔴 Urgente</Badge>,
    };
    return badges[priority as keyof typeof badges] || null;
  };

  const getDemandTypeBadge = (ticket: Ticket) => {
    if (ticket.is_live_chat) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">🟢 Chat en cours</Badge>;
    } else if (ticket.escalated_from_chat) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">🔄 Ex-Chat</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">🎫 Ticket</Badge>;
    }
  };

  const stats = getStats();

  return (
    <div className={`${darkMode ? 'dark' : ''} space-y-6`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            Support & Tickets
          </h1>
          <p className="text-muted-foreground mt-1">Console unifiée de gestion des demandes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Mode clair' : 'Mode sombre'}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleEmailNotifications}
            title={emailNotificationsEnabled ? 'Désactiver les emails' : 'Activer les emails'}
          >
            {emailNotificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
          className={getCardClassName('new')}
          onClick={() => setFilters({ ...filters, status: 'new' })}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Nouveaux</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.newTickets}</div>
          </CardContent>
        </Card>
        <Card 
          className={getCardClassName('waiting_user')}
          onClick={() => setFilters({ ...filters, status: 'waiting_user' })}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Attente utilisateur</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.waitingUser}</div>
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
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
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
          className={getCardClassName('closed')}
          onClick={() => setFilters({ ...filters, status: 'closed' })}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fermés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.closed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Demandes</CardTitle>
            <CardDescription>Chats en cours et tickets</CardDescription>
            
            <div className="grid grid-cols-2 gap-2 pt-4">
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
                            {ticket.assigned_to && (
                              <p className="text-xs text-primary font-medium mt-1">
                                👤 {formattedSupportUsers.find(u => u.id === ticket.assigned_to)?.name || 'Assigné'}
                              </p>
                            )}
                          </div>
                          {getStatusBadge(ticket.status)}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getDemandTypeBadge(ticket)}
                          <SupportLevelBadge level={ticket.support_level || 1} />
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

        <Card className="md:col-span-3">
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
                  <div className="flex gap-2 flex-wrap">
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

                    {!selectedTicket.assigned_to && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => user && takeTicket(selectedTicket.id, user.id)}
                      >
                        Prendre en charge
                      </Button>
                    )}

                    {selectedTicket.status === 'resolved' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => reopenTicket(selectedTicket.id)}
                      >
                        Rouvrir
                      </Button>
                    )}

                    <EscalateTicketDialog
                      ticket={selectedTicket}
                      supportUsers={formattedSupportUsers}
                      onEscalate={(targetLevel, targetUserId, reason) => 
                        escalateTicket(selectedTicket.id, targetLevel, targetUserId, reason)
                      }
                    />
                  </div>

                  <Separator />

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

                  <div className="flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Répondre..."
                      className="flex-1"
                      rows={3}
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <label className="text-sm font-medium">Sujet</label>
                      <p className="text-sm text-muted-foreground">{selectedTicket.subject || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">ID Utilisateur</label>
                      <p className="text-sm text-muted-foreground">{selectedTicket.user_id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Agence</label>
                      <p className="text-sm text-muted-foreground">{selectedTicket.agency_slug || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Service</label>
                      <div className="mt-1">
                        <ServiceBadge service={selectedTicket.service} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Type de demande</label>
                      <div className="mt-1">
                        {getDemandTypeBadge(selectedTicket)}
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
                    {selectedTicket.rating && (
                      <div>
                        <label className="text-sm font-medium">Note de satisfaction</label>
                        <p className="text-sm text-muted-foreground">{selectedTicket.rating} / 5</p>
                        {selectedTicket.rating_comment && (
                          <p className="text-sm text-muted-foreground italic mt-1">
                            "{selectedTicket.rating_comment}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="attachments" className="space-y-4">
                  {attachments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune pièce jointe
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((att) => (
                        <Card key={att.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{att.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(att.file_size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadAttachment(att)}
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
  );
}
