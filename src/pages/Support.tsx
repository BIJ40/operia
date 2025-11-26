import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Clock, CheckCircle, Send } from 'lucide-react';

interface SupportTicket {
  id: string;
  user_pseudo: string;
  user_id: string;
  status: string;
  priority: string;
  created_at: string;
  chatbot_conversation: any;
  assigned_to: string | null;
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_from_support: boolean;
  created_at: string;
}

export default function Support() {
  const { user, isSupport } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [activeTab, setActiveTab] = useState('waiting');

  // Rediriger si pas support
  useEffect(() => {
    if (!isSupport) {
      navigate('/');
    }
  }, [isSupport, navigate]);

  // Charger les tickets
  useEffect(() => {
    if (!user) return;
    loadTickets();

    // Écouter les changements en temps réel
    const channel = supabase
      .channel('support-tickets-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          loadTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Ouvrir automatiquement un ticket si spécifié dans l'URL
  useEffect(() => {
    const ticketId = searchParams.get('ticket');
    if (ticketId && tickets.length > 0) {
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        selectTicket(ticket);
      }
    }
  }, [searchParams, tickets]);

  // Charger les messages du ticket sélectionné
  useEffect(() => {
    if (!selectedTicket) return;

    loadMessages(selectedTicket.id);

    // Écouter les nouveaux messages
    const channel = supabase
      .channel('ticket-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${selectedTicket.id}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as SupportMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket]);

  // Gérer l'indicateur de frappe
  useEffect(() => {
    if (!selectedTicket) return;

    const typingChannel = supabase.channel(`typing:${selectedTicket.id}`);

    typingChannel
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        // Vérifier si l'utilisateur est en train de taper
        const userTyping = Object.values(state).some((presences: any) => 
          presences.some((p: any) => !p.is_support && p.typing)
        );
        setIsUserTyping(userTyping);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
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

  const loadTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les tickets',
        variant: 'destructive',
        duration: 4000,
      });
    }
  };

  const loadMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const selectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setMessages([]);
  };

  const takeTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: 'in_progress',
          assigned_to: user!.id,
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Ticket pris en charge',
        description: 'Vous pouvez maintenant répondre au client',
        duration: 4000,
      });
      
      loadTickets();
    } catch (error) {
      console.error('Error taking ticket:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de prendre en charge le ticket',
        variant: 'destructive',
        duration: 4000,
      });
    }
  };

  const handleTyping = async () => {
    if (!selectedTicket) return;

    const typingChannel = supabase.channel(`typing:${selectedTicket.id}`);
    
    await typingChannel.track({
      user_id: user?.id,
      is_support: true,
      typing: true,
      online_at: new Date().toISOString(),
    });

    setTimeout(async () => {
      await typingChannel.track({
        user_id: user?.id,
        is_support: true,
        typing: false,
        online_at: new Date().toISOString(),
      });
    }, 3000);
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedTicket || !user) return;

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          message: messageInput.trim(),
          is_from_support: true,
        });

      if (error) throw error;
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message',
        variant: 'destructive',
        duration: 4000,
      });
    }
  };

  const resolveTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Ticket résolu',
        description: 'Le ticket a été marqué comme résolu',
        duration: 4000,
      });

      setSelectedTicket(null);
      loadTickets();
    } catch (error) {
      console.error('Error resolving ticket:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de résoudre le ticket',
        variant: 'destructive',
        duration: 4000,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      waiting: { variant: 'secondary' as const, label: 'En attente' },
      in_progress: { variant: 'default' as const, label: 'En cours' },
      resolved: { variant: 'outline' as const, label: 'Résolu' },
    };
    const config = variants[status as keyof typeof variants] || variants.waiting;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredTickets = tickets.filter(t => t.status === activeTab);

  if (!isSupport) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Support Client</h1>
            <p className="text-muted-foreground">Gérez les demandes d'assistance des utilisateurs</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Liste des tickets */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="waiting" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      Attente
                    </TabsTrigger>
                    <TabsTrigger value="in_progress" className="text-xs">
                      En cours
                    </TabsTrigger>
                    <TabsTrigger value="resolved" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Résolus
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeTab}>
                    <ScrollArea className="h-[600px]">
                      <div className="space-y-2">
                        {filteredTickets.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            Aucun ticket {activeTab === 'waiting' ? 'en attente' : activeTab === 'in_progress' ? 'en cours' : 'résolu'}
                          </p>
                        ) : (
                          filteredTickets.map(ticket => (
                            <Card
                              key={ticket.id}
                              className={`cursor-pointer transition-colors hover:bg-accent ${
                                selectedTicket?.id === ticket.id ? 'border-primary bg-accent' : ''
                              }`}
                              onClick={() => selectTicket(ticket)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="font-semibold text-sm">{ticket.user_pseudo}</div>
                                  {getStatusBadge(ticket.status)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(ticket.created_at).toLocaleString('fr-FR')}
                                </p>
                                {ticket.status === 'waiting' && (
                                  <Button
                                    size="sm"
                                    className="w-full mt-3"
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
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Conversation */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {selectedTicket ? `Conversation avec ${selectedTicket.user_pseudo}` : 'Sélectionnez un ticket'}
                    </CardTitle>
                    {selectedTicket && (
                      <CardDescription>
                        Ticket créé le {new Date(selectedTicket.created_at).toLocaleString('fr-FR')}
                      </CardDescription>
                    )}
                  </div>
                  {selectedTicket && selectedTicket.status !== 'resolved' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resolveTicket(selectedTicket.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Résoudre
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedTicket ? (
                  <>
                    <ScrollArea className="h-[500px] mb-4 pr-4">
                      {/* Historique chatbot */}
                      {selectedTicket.chatbot_conversation?.length > 0 && (
                        <div className="mb-6 pb-6 border-b">
                          <p className="text-xs text-muted-foreground text-center mb-3">
                            Conversation avec Mme MICHU
                          </p>
                          {selectedTicket.chatbot_conversation.map((msg: any, idx: number) => (
                            <div
                              key={idx}
                              className={`mb-3 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
                            >
                              <div
                                className={`inline-block max-w-[80%] p-3 rounded-lg opacity-70 ${
                                  msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Messages support */}
                      {messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`mb-3 ${msg.is_from_support ? 'text-right' : 'text-left'}`}
                        >
                          <div
                            className={`inline-block max-w-[80%] p-3 rounded-lg ${
                              msg.is_from_support
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      ))}

                      {isUserTyping && (
                        <div className="text-left">
                          <div className="inline-block bg-muted p-3 rounded-lg">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                            </div>
                          </div>
                        </div>
                      )}
                    </ScrollArea>

                    {selectedTicket.status !== 'resolved' && (
                      <div className="flex gap-2">
                        <Input
                          value={messageInput}
                          onChange={(e) => {
                            setMessageInput(e.target.value);
                            handleTyping();
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          placeholder="Tapez votre réponse..."
                          className="flex-1"
                        />
                        <Button onClick={sendMessage} disabled={!messageInput.trim()}>
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Sélectionnez un ticket pour voir la conversation</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}
