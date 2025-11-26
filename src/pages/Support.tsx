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
import { Loader2, Send, Download, User, Moon, Sun, Bell, BellOff } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Support() {
  const { isSupport, isAdmin, user } = useAuth();
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
    takeTicket,
    addSupportMessage,
    downloadAttachment,
    reopenTicket,
    getStats,
  } = useAdminTickets();

  const [newMessage, setNewMessage] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [supportUsers, setSupportUsers] = useState<Array<{ id: string; name: string }>>([]);

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

  // Charger la liste des users support et admin
  useEffect(() => {
    const loadSupportUsers = async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['support', 'admin']);

      if (roles) {
        const userIds = [...new Set(roles.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        if (profiles) {
          setSupportUsers(
            profiles.map(p => ({
              id: p.id,
              name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sans nom'
            }))
          );
        }
      }
    };

    loadSupportUsers();
  }, []);

  // Charger les préférences email
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
    const badges = {
      waiting: <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">En attente</Badge>,
      in_progress: <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">En cours</Badge>,
      resolved: <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Résolu</Badge>,
      unresolved: <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">Non résolu</Badge>,
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
    <>
      <Header />
      <div className={`min-h-screen ${darkMode ? 'dark' : ''} bg-gradient-to-br from-background to-muted/20`}>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
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

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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

          <div className="grid gap-6 md:grid-cols-5">
            {/* Tickets List */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Demandes</CardTitle>
                <CardDescription>Chats en cours et tickets</CardDescription>
                
                {/* Filters - 2 lignes */}
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
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {ticket.user_pseudo}
                                </p>
                                {ticket.assigned_to && (
                                  <p className="text-xs text-primary font-medium mt-1">
                                    👤 {supportUsers.find(u => u.id === ticket.assigned_to)?.name || 'Assigné'}
                                  </p>
                                )}
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
                      {/* Controls */}
                      <div className="flex gap-2 flex-wrap items-center">
                        {selectedTicket.status === 'waiting' && selectedTicket.assigned_to !== user?.id && (
                          <Button
                            onClick={() => user && takeTicket(selectedTicket.id, user.id)}
                            className="bg-gradient-to-r from-primary to-helpconfort-blue-dark text-white hover:opacity-90 rounded-2xl shadow-lg border-l-4 border-l-accent"
                          >
                            👋 Prendre en charge
                          </Button>
                        )}

                        <Select
                          value={selectedTicket.assigned_to || 'none'}
                          onValueChange={(v) => assignTicket(selectedTicket.id, v === 'none' ? '' : v)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Non assigné" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Non assigné</SelectItem>
                            {supportUsers.map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                👤 {u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

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
                                className={`max-w-[70%] rounded-lg p-3 ${
                                  msg.is_from_support
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {format(new Date(msg.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      {/* Message Input */}
                      {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'unresolved' && (
                        <div className="flex gap-2">
                          <Textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Votre réponse..."
                            className="flex-1"
                            rows={3}
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim()}
                            size="icon"
                            className="self-end"
                          >
                            <Send className="w-4 h-4" />
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
                          <label className="text-sm font-medium">Assigné à</label>
                          <p className="text-sm text-muted-foreground">
                            {selectedTicket.assigned_to 
                              ? `👤 ${supportUsers.find(u => u.id === selectedTicket.assigned_to)?.name || 'Utilisateur inconnu'}`
                              : 'Non assigné'}
                          </p>
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
                        {selectedTicket.rating && (
                          <div>
                            <label className="text-sm font-medium">Note de satisfaction</label>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} className={i < selectedTicket.rating! ? 'text-yellow-400' : 'text-gray-300'}>
                                  ★
                                </span>
                              ))}
                            </div>
                            {selectedTicket.rating_comment && (
                              <p className="text-sm text-muted-foreground mt-1 italic">
                                "{selectedTicket.rating_comment}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="attachments">
                      {attachments.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Aucune pièce jointe
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {attachments.map((att) => (
                            <div key={att.id} className="flex items-center justify-between p-3 border rounded">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{att.file_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(att.file_size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => downloadAttachment(att)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
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
    </>
  );
}
