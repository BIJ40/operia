/**
 * AgentUnifiedChat - Vue unifiée pour agent support
 * Combine liste sessions + chat + clôture en une seule interface
 * Remplace AgentLiveChatDialog (dialog modal) par une interface inline
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Headphones, User, Clock, MessageCircle, Loader2, 
  Send, CheckCheck, X, Ticket, Archive, ChevronLeft 
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logError } from '@/lib/logger';

interface LiveMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  is_from_support: boolean;
  created_at: string;
}

interface LiveSession {
  id: string;
  user_id: string;
  user_name: string | null;
  agency_slug: string | null;
  status: string;
  agent_id: string | null;
  created_at: string;
  closed_by?: string | null;
  closed_reason?: string | null;
}

export function AgentUnifiedChat() {
  const { user, firstName, lastName } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const agentName = `${firstName || ''} ${lastName || ''}`.trim() || 'Agent Support';

  // Charger les sessions actives
  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('live_support_sessions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading live sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadSessions();

    // Écouter les changements en temps réel
    const channel = supabase
      .channel('agent-unified-sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_support_sessions' },
        (payload) => {
          // Si session fermée par user, notifier l'agent et recharger
          if (payload.eventType === 'UPDATE') {
            const session = payload.new as LiveSession;
            if ((session.status === 'closed' || session.status === 'converted') && session.closed_by === 'user') {
              toast.info(`Session fermée par ${session.user_name || 'l\'utilisateur'}`, {
                description: session.closed_reason || 'L\'utilisateur a mis fin à la conversation',
              });
              // Si c'était la session sélectionnée, la désélectionner
              if (selectedSession?.id === session.id) {
                setSelectedSession(null);
              }
            }
          }
          loadSessions();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedSession?.id]);

  // Charger les messages quand session sélectionnée
  useEffect(() => {
    if (!selectedSession?.id) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from('live_support_messages')
          .select('*')
          .eq('session_id', selectedSession.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();

    // Écouter les nouveaux messages
    const channel = supabase
      .channel(`agent-chat-unified-${selectedSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_support_messages',
          filter: `session_id=eq.${selectedSession.id}`,
        },
        (payload) => {
          const newMessage = payload.new as LiveMessage;
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedSession?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Prendre en charge une session
  const handleTakeSession = async (session: LiveSession) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('live_support_sessions')
        .update({ agent_id: user.id })
        .eq('id', session.id);

      if (error) throw error;
      toast.success('Session prise en charge');
      setSelectedSession({ ...session, agent_id: user.id });
    } catch (error) {
      console.error('Error taking session:', error);
      toast.error('Erreur lors de la prise en charge');
    }
  };

  // Envoyer un message
  const handleSend = async () => {
    if (!input.trim() || !selectedSession?.id || !user?.id || isSending) return;

    const content = input.trim();
    setInput('');
    setIsSending(true);

    try {
      const { error } = await supabase
        .from('live_support_messages')
        .insert({
          session_id: selectedSession.id,
          sender_id: user.id,
          sender_name: agentName,
          content,
          is_from_support: true,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi');
      setInput(content);
    } finally {
      setIsSending(false);
    }
  };

  // Fermer session (résolu)
  const handleResolve = async () => {
    if (!selectedSession) return;
    setIsClosing(true);
    try {
      const { error } = await supabase
        .from('live_support_sessions')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString(),
          agent_name: agentName,
          closed_by: 'agent',
          closed_reason: 'Problème résolu par le support',
        } as any)
        .eq('id', selectedSession.id);

      if (error) throw error;
      toast.success('Session fermée et archivée');
      setSelectedSession(null);
      loadSessions();
    } catch (error) {
      logError(error, 'LIVE_SESSION_CLOSE');
      toast.error('Erreur lors de la fermeture');
    } finally {
      setIsClosing(false);
    }
  };

  // Transformer en ticket
  const handleTransformToTicket = async () => {
    if (!selectedSession || !user?.id) return;
    setIsClosing(true);
    
    try {
      const chatHistory = messages.map(m => ({
        role: m.is_from_support ? 'support' : 'user',
        content: m.content,
        sender: m.sender_name,
        timestamp: m.created_at,
      }));

      const subject = messages.find(m => !m.is_from_support)?.content?.substring(0, 100) 
        || 'Conversation live support';

      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: selectedSession.user_id,
          subject,
          status: 'new',
          heat_priority: 6,
          source: 'chat',
          type: 'chat_human',
          agency_slug: selectedSession.agency_slug || null,
          chatbot_conversation: chatHistory,
          support_level: 1,
          assigned_to: user.id,
        })
        .select('id')
        .single();

      if (ticketError) throw ticketError;

      await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          message: `Ticket créé depuis une conversation live support.\n\nHistorique:\n${messages.map(m => `[${m.is_from_support ? 'Agent' : selectedSession.user_name || 'Utilisateur'}] ${m.content}`).join('\n')}`,
          is_from_support: true,
          is_internal_note: true,
        });

      await supabase
        .from('live_support_sessions')
        .update({ 
          status: 'converted',
          closed_at: new Date().toISOString(),
          agent_name: agentName,
          closed_by: 'agent',
          closed_reason: 'Converti en ticket support pour suivi',
        } as any)
        .eq('id', selectedSession.id);

      toast.success('Session convertie en ticket');
      setSelectedSession(null);
      loadSessions();
    } catch (error) {
      logError(error, 'LIVE_SESSION_TO_TICKET');
      toast.error('Erreur lors de la conversion');
    } finally {
      setIsClosing(false);
    }
  };

  const waitingSessions = sessions.filter(s => !s.agent_id);
  const mySessions = sessions.filter(s => s.agent_id === user?.id);
  const otherSessions = sessions.filter(s => s.agent_id && s.agent_id !== user?.id);

  if (isLoadingSessions) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Vue avec session sélectionnée
  if (selectedSession) {
    return (
      <Card className="h-[600px] flex flex-col">
        {/* Header */}
        <CardHeader className="py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedSession(null)}
                className="mr-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Headphones className="w-5 h-5 text-green-500" />
              <CardTitle className="text-base">
                Chat avec {selectedSession.user_name || 'Utilisateur'}
              </CardTitle>
              {selectedSession.agency_slug && (
                <Badge variant="outline">{selectedSession.agency_slug}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">
                <CheckCheck className="w-3 h-3 mr-1" />
                Connecté
              </Badge>
            </div>
          </div>
        </CardHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-start gap-2",
                    msg.is_from_support ? "justify-end" : "justify-start"
                  )}
                >
                  {!msg.is_from_support && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1 max-w-[70%]">
                    {!msg.is_from_support && (
                      <span className="text-xs text-muted-foreground ml-1">
                        {msg.sender_name}
                      </span>
                    )}
                    <div
                      className={cn(
                        "p-3 rounded-lg text-sm",
                        msg.is_from_support
                          ? "bg-helpconfort-blue text-white"
                          : "bg-muted"
                      )}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-1">
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  {msg.is_from_support && (
                    <div className="w-8 h-8 rounded-full bg-helpconfort-blue flex items-center justify-center flex-shrink-0">
                      <Headphones className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Zone de saisie */}
        <div className="p-4 border-t">
          <div className="flex gap-2 mb-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Écrivez votre réponse..."
              disabled={isSending}
              className="flex-1"
            />
            <Button 
              onClick={handleSend} 
              disabled={!input.trim() || isSending}
              className="bg-helpconfort-blue hover:bg-helpconfort-blue/90"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          
          {/* Actions de clôture inline */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-green-500/30 hover:bg-green-500/10"
              onClick={handleResolve}
              disabled={isClosing}
            >
              {isClosing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Archive className="w-4 h-4 mr-2 text-green-500" />}
              Résolu
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-helpconfort-blue/30 hover:bg-helpconfort-blue/10"
              onClick={handleTransformToTicket}
              disabled={isClosing}
            >
              {isClosing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Ticket className="w-4 h-4 mr-2 text-helpconfort-blue" />}
              Convertir en ticket
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Vue liste des sessions
  return (
    <div className="space-y-6">
      {/* Sessions en attente */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          En attente d'agent ({waitingSessions.length})
        </h3>
        
        {waitingSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune demande en attente
          </p>
        ) : (
          <div className="space-y-2">
            {waitingSessions.map((session) => (
              <Card 
                key={session.id} 
                className="border-l-4 border-l-red-500 animate-pulse cursor-pointer hover:shadow-md transition-all"
                onClick={() => handleTakeSession(session)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <Headphones className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium">{session.user_name || 'Utilisateur'}</p>
                        {session.agency_slug && (
                          <p className="text-xs text-muted-foreground">
                            Agence: {session.agency_slug}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="animate-pulse">En attente</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(session.created_at), 'HH:mm', { locale: fr })}
                      </span>
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-3 bg-red-600 hover:bg-red-700"
                    onClick={(e) => { e.stopPropagation(); handleTakeSession(session); }}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Prendre en charge
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Mes sessions actives */}
      {mySessions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Mes conversations ({mySessions.length})
          </h3>
          <div className="space-y-2">
            {mySessions.map((session) => (
              <Card 
                key={session.id} 
                className="border-l-4 border-l-green-500 cursor-pointer hover:shadow-md transition-all"
                onClick={() => setSelectedSession(session)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <User className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{session.user_name || 'Utilisateur'}</p>
                        {session.agency_slug && (
                          <p className="text-xs text-muted-foreground">Agence: {session.agency_slug}</p>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-green-500">En cours</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Sessions prises par d'autres */}
      {otherSessions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Prises en charge par d'autres ({otherSessions.length})
          </h3>
          <div className="space-y-2 opacity-60">
            {otherSessions.map((session) => (
              <Card key={session.id} className="border-l-4 border-l-gray-400">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium">{session.user_name || 'Utilisateur'}</p>
                        {session.agency_slug && (
                          <p className="text-xs text-muted-foreground">Agence: {session.agency_slug}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline">Pris en charge</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
