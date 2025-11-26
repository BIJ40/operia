import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTickets } from '@/hooks/use-user-tickets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TicketSourceBadge } from '@/components/tickets/TicketSourceBadge';
import { TicketCategoryBadge } from '@/components/tickets/TicketCategoryBadge';
import { ServiceBadge } from '@/components/tickets/ServiceBadge';
import { Plus, Send, Download, ArrowLeft, MessageSquare, History } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function UserDemands() {
  const { user } = useAuth();
  const {
    tickets,
    selectedTicket,
    setSelectedTicket,
    attachments,
    messages,
    isLoading,
    isCreating,
    createTicket,
    addMessage,
    downloadAttachment,
  } = useUserTickets();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    service: 'autre',
    category: 'question',
    description: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const handleCreateTicket = async () => {
    const trimmedSubject = newTicket.subject.trim();
    const trimmedDescription = newTicket.description.trim();
    
    if (!trimmedSubject || trimmedSubject.length < 3) {
      return;
    }
    
    if (!trimmedDescription) {
      return;
    }

    const ticket = await createTicket(
      trimmedSubject,
      newTicket.service,
      newTicket.category,
      trimmedDescription,
      files
    );

    if (ticket) {
      setNewTicket({ subject: '', service: 'autre', category: 'question', description: '' });
      setFiles([]);
      setShowCreateForm(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    await addMessage(selectedTicket.id, newMessage);
    setNewMessage('');
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      waiting: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      in_progress: { label: 'En cours', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      resolved: { label: 'Résolu', className: 'bg-green-100 text-green-800 border-green-300' },
      unresolved: { label: 'Non résolu', className: 'bg-red-100 text-red-800 border-red-300' },
    };

    const { label, className } = config[status] || config.waiting;
    return <Badge variant="outline" className={className}>{label}</Badge>;
  };

  const getDemandTypeBadge = (ticket: any) => {
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

  const chatTickets = tickets.filter(t => t.is_live_chat || t.escalated_from_chat);
  const portalTickets = tickets.filter(t => !t.is_live_chat && !t.escalated_from_chat);

  if (selectedTicket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedTicket(null)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la liste
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{selectedTicket.subject}</CardTitle>
                  <div className="text-sm text-muted-foreground mb-2">
                    Demande créée par <span className="font-semibold">{selectedTicket.user_pseudo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getDemandTypeBadge(selectedTicket)}
                    <ServiceBadge service={selectedTicket.service} />
                    <TicketSourceBadge source={selectedTicket.source} />
                    {selectedTicket.category && <TicketCategoryBadge category={selectedTicket.category} />}
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Créé le {format(new Date(selectedTicket.created_at), 'PPp', { locale: fr })}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Attachments */}
              {attachments.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Pièces jointes</h3>
                  <div className="space-y-2">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <span className="text-sm">{att.file_name}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadAttachment(att)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Messages */}
              <div>
                <h3 className="font-semibold mb-2">Conversation</h3>
                <ScrollArea className="h-96 border rounded p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded ${
                          msg.is_from_support
                            ? 'bg-blue-50 ml-8'
                            : 'bg-muted mr-8'
                        }`}
                      >
                        <div className="text-xs text-muted-foreground mb-1">
                          {msg.is_from_support ? 'Support' : 'Vous'} •{' '}
                          {format(new Date(msg.created_at), 'PPp', { locale: fr })}
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* New message input */}
              {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'unresolved' && (
                <div className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Votre message..."
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Mes demandes</h1>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau ticket
          </Button>
        </div>

        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Créer un nouveau ticket</CardTitle>
              <CardDescription>
                Décrivez votre problème ou votre question
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Service concerné *</Label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewTicket({ ...newTicket, service: 'apogee' })}
                    className={`rounded-2xl border-l-4 transition-all ${
                      newTicket.service === 'apogee'
                        ? 'border-l-accent bg-gradient-to-r from-primary to-helpconfort-blue-dark text-white shadow-lg hover:shadow-xl'
                        : 'border-l-border hover:border-l-accent hover:shadow-md'
                    }`}
                  >
                    🖥️ Apogée
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewTicket({ ...newTicket, service: 'helpconfort' })}
                    className={`rounded-2xl border-l-4 transition-all ${
                      newTicket.service === 'helpconfort'
                        ? 'border-l-accent bg-gradient-to-r from-primary to-helpconfort-blue-dark text-white shadow-lg hover:shadow-xl'
                        : 'border-l-border hover:border-l-accent hover:shadow-md'
                    }`}
                  >
                    🏠 HelpConfort
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewTicket({ ...newTicket, service: 'apporteurs' })}
                    className={`rounded-2xl border-l-4 transition-all ${
                      newTicket.service === 'apporteurs'
                        ? 'border-l-accent bg-gradient-to-r from-primary to-helpconfort-blue-dark text-white shadow-lg hover:shadow-xl'
                        : 'border-l-border hover:border-l-accent hover:shadow-md'
                    }`}
                  >
                    🤝 Apporteurs
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewTicket({ ...newTicket, service: 'conseil' })}
                    className={`rounded-2xl border-l-4 transition-all ${
                      newTicket.service === 'conseil'
                        ? 'border-l-accent bg-gradient-to-r from-primary to-helpconfort-blue-dark text-white shadow-lg hover:shadow-xl'
                        : 'border-l-border hover:border-l-accent hover:shadow-md'
                    }`}
                  >
                    💡 Conseil
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewTicket({ ...newTicket, service: 'autre' })}
                    className={`rounded-2xl border-l-4 transition-all ${
                      newTicket.service === 'autre'
                        ? 'border-l-accent bg-gradient-to-r from-primary to-helpconfort-blue-dark text-white shadow-lg hover:shadow-xl'
                        : 'border-l-border hover:border-l-accent hover:shadow-md'
                    }`}
                  >
                    ❓ Autre
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="category">Catégorie</Label>
                <Select
                  value={newTicket.category}
                  onValueChange={(v) => setNewTicket({ ...newTicket, category: v })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="improvement">Amélioration</SelectItem>
                    <SelectItem value="blocking">Blocage</SelectItem>
                    <SelectItem value="question">Question</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subject">Sujet *</Label>
                <Input
                  id="subject"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  placeholder="Titre de votre demande (minimum 3 caractères)"
                  required
                  minLength={3}
                />
                {newTicket.subject.trim().length > 0 && newTicket.subject.trim().length < 3 && (
                  <p className="text-sm text-destructive mt-1">Le sujet doit contenir au moins 3 caractères</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  placeholder="Décrivez votre problème en détail"
                  rows={5}
                  required
                />
              </div>

              <div>
                <Label htmlFor="files">Pièces jointes (optionnel)</Label>
                <Input
                  id="files"
                  type="file"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateTicket}
                  disabled={
                    isCreating || 
                    newTicket.subject.trim().length < 3 || 
                    !newTicket.description.trim()
                  }
                >
                  {isCreating ? 'Création...' : 'Créer le ticket'}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="chats" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chats" className="gap-2">
              <History className="w-4 h-4" />
              Historique des chats ({chatTickets.length})
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Mes tickets ({portalTickets.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="text-center py-12">Chargement...</div>
            ) : chatTickets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Aucun historique de chat.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {chatTickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle>{ticket.subject}</CardTitle>
                            {ticket.unreadCount && ticket.unreadCount > 0 && (
                              <Badge className="bg-red-500 text-white hover:bg-red-600">
                                {ticket.unreadCount} nouveau{ticket.unreadCount > 1 ? 'x' : ''}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getDemandTypeBadge(ticket)}
                            <ServiceBadge service={ticket.service} />
                            {getStatusBadge(ticket.status)}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(ticket.created_at), 'PPp', { locale: fr })}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="text-center py-12">Chargement...</div>
            ) : portalTickets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Aucun ticket. Créez-en un pour commencer.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {portalTickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle>{ticket.subject}</CardTitle>
                            {ticket.unreadCount && ticket.unreadCount > 0 && (
                              <Badge className="bg-red-500 text-white hover:bg-red-600">
                                {ticket.unreadCount} nouveau{ticket.unreadCount > 1 ? 'x' : ''}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getDemandTypeBadge(ticket)}
                            <ServiceBadge service={ticket.service} />
                            <TicketCategoryBadge category={ticket.category} />
                            {getStatusBadge(ticket.status)}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(ticket.created_at), 'PPp', { locale: fr })}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
