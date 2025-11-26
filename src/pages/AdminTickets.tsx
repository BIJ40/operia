import { useEffect, useState } from 'react';
import { useAdminTickets } from '@/hooks/use-admin-tickets';
import { Ticket } from '@/hooks/use-user-tickets';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TicketCategoryBadge } from '@/components/tickets/TicketCategoryBadge';
import { Loader2, Send, Download, AlertCircle, Clock, CheckCircle2, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout } from '@/components/Layout';

export default function AdminTickets() {
  const { canManageTickets } = useAuth();
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
    getStats,
  } = useAdminTickets();

  const { user } = useAuth();

  useEffect(() => {
    if (!canManageTickets()) {
      navigate('/');
    }
  }, [canManageTickets, navigate]);

  const stats = getStats();
  const [newMessage, setNewMessage] = useState('');

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
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
              Gestion des Tickets
            </h1>
            <p className="text-muted-foreground">Console support et franchiseur</p>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">En attente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.waiting}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">En cours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Résolus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Tickets List */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Tickets</CardTitle>
              <CardDescription>Liste de tous les tickets</CardDescription>
              
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
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="live_chat">🟢 Chats en cours</SelectItem>
                    <SelectItem value="escalated">🔄 Ex-Demandes</SelectItem>
                    <SelectItem value="portal">🎫 Tickets</SelectItem>
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
                  <p className="text-center text-muted-foreground py-8">Aucun ticket</p>
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
                {selectedTicket ? 'Détail du ticket' : 'Sélectionnez un ticket'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedTicket ? (
                <p className="text-center text-muted-foreground py-8">
                  Sélectionnez un ticket dans la liste pour voir les détails
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
                    <div className="flex gap-2">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Répondre au ticket..."
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

                  <TabsContent value="attachments">
                    {attachments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Aucune pièce jointe</p>
                    ) : (
                      <div className="space-y-2">
                        {attachments.map((att) => (
                          <Card key={att.id}>
                            <CardContent className="p-4 flex items-center justify-between">
                              <div>
                                <p className="font-medium">{att.file_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(att.file_size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadAttachment(att)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </CardContent>
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
    </Layout>
  );
}
