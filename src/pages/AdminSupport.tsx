import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, CheckCircle2, Clock, AlertCircle, Send, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SupportTicket {
  id: string;
  user_pseudo: string;
  user_id: string;
  assigned_to: string | null;
  status: string;
  priority: string;
  chatbot_conversation: any;
  created_at: string;
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_from_support: boolean;
  created_at: string;
  read_at: string | null;
}

export default function AdminSupport() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const ticketIdFromUrl = searchParams.get('ticket');

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [filter, setFilter] = useState<'waiting' | 'in_progress' | 'resolved'>('waiting');
  const [isUserTyping, setIsUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAdmin && !user) {
      navigate('/');
      return;
    }
    loadTickets();
  }, [isAdmin, user, navigate]);

  // Si ticket ID dans l'URL, l'ouvrir automatiquement
  useEffect(() => {
    if (ticketIdFromUrl && tickets.length > 0) {
      const ticket = tickets.find(t => t.id === ticketIdFromUrl);
      if (ticket) {
        selectTicket(ticket);
      }
    }
  }, [ticketIdFromUrl, tickets]);

  // Realtime pour les nouveaux tickets
  useEffect(() => {
    const channel = supabase
      .channel('support-tickets-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets'
        },
        (payload) => {
          console.log('New ticket:', payload);
          loadTickets();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets'
        },
        (payload) => {
          console.log('Ticket updated:', payload);
          loadTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Realtime pour les messages du ticket sélectionné
  useEffect(() => {
    if (!selectedTicket) return;

    const channel = supabase
      .channel(`support-messages-${selectedTicket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${selectedTicket.id}`
        },
        (payload) => {
          console.log('New message:', payload);
          setMessages((prev) => [...prev, payload.new as SupportMessage]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket]);

  // Gérer l'indicateur de frappe en temps réel
  useEffect(() => {
    if (!selectedTicket) return;

    const typingChannel = supabase.channel(`typing:${selectedTicket.id}`);

    typingChannel
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        // Vérifier si l'utilisateur (non support) est en train de taper
        const userTyping = Object.values(state).some((presences: any) => 
          presences.some((p: any) => !p.is_support && p.typing)
        );
        setIsUserTyping(userTyping);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Envoyer l'état initial (pas en train de taper)
          await typingChannel.track({
            user_id: user?.id,
            is_support: true,
            typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, [selectedTicket, user]);

  // Nettoyer le timeout de frappe au démontage
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data as any || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  const selectTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    
    // Charger les messages du ticket
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const takeTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          assigned_to: user?.id,
          status: 'in_progress'
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Ticket pris en charge',
        description: 'Vous êtes maintenant assigné à ce ticket',
      });

      loadTickets();
      
      // Sélectionner automatiquement le ticket
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        selectTicket({ ...ticket, assigned_to: user!.id, status: 'in_progress' });
      }
    } catch (error) {
      console.error('Error taking ticket:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de prendre en charge ce ticket',
        variant: 'destructive',
      });
    }
  };

  // Gérer l'indicateur de frappe
  const handleTyping = async () => {
    if (!selectedTicket) return;

    const typingChannel = supabase.channel(`typing:${selectedTicket.id}`);
    
    // Envoyer l'état "en train de taper"
    await typingChannel.track({
      user_id: user?.id,
      is_support: true,
      typing: true,
      online_at: new Date().toISOString(),
    });

    // Annuler le timeout précédent
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Réinitialiser l'état après 3 secondes d'inactivité
    typingTimeoutRef.current = setTimeout(async () => {
      await typingChannel.track({
        user_id: user?.id,
        is_support: true,
        typing: false,
        online_at: new Date().toISOString(),
      });
    }, 3000);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !user) return;

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          message: newMessage.trim(),
          is_from_support: true,
        } as any);

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message',
        variant: 'destructive',
      });
    }
  };

  const resolveTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Ticket résolu',
        description: 'Le ticket a été marqué comme résolu',
      });

      setSelectedTicket(null);
      loadTickets();
    } catch (error) {
      console.error('Error resolving ticket:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de résoudre le ticket',
        variant: 'destructive',
      });
    }
  };

  const filteredTickets = tickets.filter(t => t.status === filter);
  const waitingCount = tickets.filter(t => t.status === 'waiting').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="w-8 h-8" />
          Support Client
        </h1>
        <p className="text-muted-foreground mt-2">
          Gérer les demandes d'assistance utilisateurs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des tickets */}
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
                filteredTickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      selectedTicket?.id === ticket.id ? 'border-primary border-2' : ''
                    } ${
                      ticket.priority === 'urgent' && ticket.status === 'waiting' 
                        ? 'border-l-4 border-l-destructive' 
                        : ''
                    }`}
                    onClick={() => selectTicket(ticket)}
                  >
                    <CardHeader className="pb-2 pt-3 px-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <User className="w-3.5 h-3.5" />
                            {ticket.user_pseudo}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            #{ticket.id.substring(0, 8)} • {format(new Date(ticket.created_at), 'd MMM HH:mm', { locale: fr })}
                          </CardDescription>
                        </div>
                        {ticket.priority === 'urgent' && (
                          <Badge variant="destructive" className="text-xs">Urgent</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3 px-3">
                      {ticket.status === 'waiting' && !ticket.assigned_to && (
                        <Button
                          size="sm"
                          className="w-full mt-2 h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            takeTicket(ticket.id);
                          }}
                        >
                          Prendre en charge
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Chat interface */}
        <div className="lg:col-span-2">
          {!selectedTicket ? (
            <Card className="h-[600px] flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Sélectionnez un ticket pour voir les détails</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {selectedTicket.user_pseudo}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Ticket #{selectedTicket.id.substring(0, 8)} • {format(new Date(selectedTicket.created_at), 'd MMMM yyyy à HH:mm', { locale: fr })}
                    </CardDescription>
                  </div>
                  {selectedTicket.status !== 'resolved' && (
                    <Button
                      size="sm"
                      onClick={() => resolveTicket(selectedTicket.id)}
                      className="h-7 text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Résoudre
                    </Button>
                  )}
                </div>
              </CardHeader>

              <div className="flex-1 flex flex-col min-h-0">
                {/* Contexte Mme MICHU */}
                {selectedTicket.chatbot_conversation?.length > 0 && (
                  <div className="px-6 pb-3 border-b">
                    <details className="text-sm">
                      <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">
                        📜 Contexte conversation Mme MICHU ({selectedTicket.chatbot_conversation.length} messages)
                      </summary>
                      <ScrollArea className="h-40 mt-2 bg-muted/30 rounded p-3">
                        {selectedTicket.chatbot_conversation.map((msg: any, idx: number) => (
                          <div key={idx} className={`mb-2 text-xs ${msg.role === 'user' ? 'font-medium' : 'text-muted-foreground'}`}>
                            <span className="font-bold">{msg.role === 'user' ? '👤' : '🤖'}</span> {msg.content}
                          </div>
                        ))}
                      </ScrollArea>
                    </details>
                  </div>
                )}

                {/* Messages du chat */}
                <ScrollArea className="flex-1 px-6 py-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      Aucun message pour le moment
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`mb-4 ${msg.is_from_support ? 'text-right' : 'text-left'}`}
                      >
                        <div
                          className={`inline-block max-w-[80%] p-3 rounded-lg ${
                            msg.is_from_support
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                          <div className="text-xs opacity-70 mt-1">
                            {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Indicateur de frappe */}
                {isUserTyping && (
                  <div className="px-4 py-2 text-xs text-muted-foreground italic border-t">
                    L'utilisateur est en train de taper...
                  </div>
                )}

                {/* Input message */}
                {selectedTicket.status !== 'resolved' && (
                  <div className="p-4 border-t">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        sendMessage();
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          handleTyping(); // Envoyer l'état de frappe
                        }}
                        placeholder="Écrire votre réponse..."
                        className="flex-1"
                      />
                      <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
