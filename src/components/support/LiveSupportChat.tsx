/**
 * LiveSupportChat.tsx
 * Chat en temps réel avec un agent support humain
 * Utilise Supabase Realtime pour la messagerie instantanée
 */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, User, Headphones, AlertCircle, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';
import { cn } from '@/lib/utils';

interface LiveMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  is_from_support: boolean;
  created_at: string;
}

interface LiveSupportChatProps {
  onClose?: () => void;
  className?: string;
}

export function LiveSupportChat({ onClose, className }: LiveSupportChatProps) {
  const { user, firstName, lastName, agence } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [agentConnected, setAgentConnected] = useState(false);
  const [waitingForAgent, setWaitingForAgent] = useState(true);

  const userName = firstName || lastName || user?.email?.split('@')[0] || 'Utilisateur';

  // Créer ou récupérer la session de chat
  useEffect(() => {
    if (!user) return;
    initializeSession();
  }, [user]);

  // Scroll automatique
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Souscrire aux messages en temps réel
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`live-support-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_support_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMessage = payload.new as LiveMessage;
          setMessages(prev => {
            // Éviter les doublons
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          
          // Si c'est un message du support, marquer l'agent comme connecté
          if (newMessage.is_from_support) {
            setAgentConnected(true);
            setWaitingForAgent(false);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_support_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const session = payload.new as { agent_id: string | null; status: string };
          if (session.agent_id) {
            setAgentConnected(true);
            setWaitingForAgent(false);
          }
          if (session.status === 'closed') {
            toast.info('La conversation a été fermée');
            onClose?.();
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, onClose]);

  const initializeSession = async () => {
    if (!user) return;

    try {
      // Vérifier s'il existe une session active
      const { data: existingSession } = await supabase
        .from('live_support_sessions')
        .select('id, agent_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (existingSession) {
        setSessionId(existingSession.id);
        if (existingSession.agent_id) {
          setAgentConnected(true);
          setWaitingForAgent(false);
        }
        
        // Charger les messages existants
        const { data: existingMessages } = await supabase
          .from('live_support_messages')
          .select('id, content, sender_id, sender_name, is_from_support, created_at')
          .eq('session_id', existingSession.id)
          .order('created_at', { ascending: true });
        
        if (existingMessages) {
          setMessages(existingMessages as LiveMessage[]);
        }
      } else {
        // Créer une nouvelle session
        const { data: newSession, error } = await supabase
          .from('live_support_sessions')
          .insert({
            user_id: user.id,
            user_name: userName,
            agency_slug: agence,
            status: 'active',
          })
          .select('id')
          .single();

        if (error) throw error;
        if (newSession) {
          setSessionId(newSession.id);

          // Notifier les agents support via toast (edge function optionnelle)
          toast.info('Un agent va vous répondre bientôt');
        }
      }
    } catch (error) {
      logError('live-support', 'Session init error', error);
      toast.error('Erreur de connexion au support');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId || isLoading) return;

    const content = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('live_support_messages')
        .insert({
          session_id: sessionId,
          sender_id: user?.id || '',
          sender_name: userName,
          content,
          is_from_support: false,
        });

      if (error) throw error;
    } catch (error) {
      logError('live-support', 'Send message error', error);
      toast.error('Erreur lors de l\'envoi');
      setInput(content); // Restaurer le message
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header avec statut */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Headphones className="w-5 h-5 text-helpconfort-blue" />
          <span className="font-medium text-sm">Chat en direct</span>
        </div>
        <div className="flex items-center gap-2">
          {waitingForAgent ? (
            <Badge variant="secondary" className="text-xs animate-pulse">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              En attente d'un agent...
            </Badge>
          ) : agentConnected ? (
            <Badge variant="default" className="text-xs bg-green-500">
              <CheckCheck className="w-3 h-3 mr-1" />
              Agent connecté
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Connexion...
            </Badge>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {/* Message d'accueil */}
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Headphones className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              {waitingForAgent ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Un agent va vous répondre dans quelques instants...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vous pouvez commencer à écrire votre message
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Décrivez votre problème, un agent est prêt à vous aider
                </p>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex items-start gap-2",
                msg.is_from_support ? "justify-start" : "justify-end"
              )}
            >
              {msg.is_from_support && (
                <div className="w-7 h-7 rounded-full bg-helpconfort-blue/10 flex items-center justify-center flex-shrink-0">
                  <Headphones className="w-4 h-4 text-helpconfort-blue" />
                </div>
              )}
              <div className="flex flex-col gap-1 max-w-[80%]">
                {msg.is_from_support && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {msg.sender_name}
                  </span>
                )}
                <div
                  className={cn(
                    "p-3 rounded-lg text-sm",
                    msg.is_from_support
                      ? "bg-muted"
                      : "bg-helpconfort-blue text-white"
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
              {!msg.is_from_support && (
                <div className="w-7 h-7 rounded-full bg-helpconfort-blue flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Zone de saisie */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez votre message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading}
            size="icon"
            className="bg-helpconfort-blue hover:bg-helpconfort-blue/90"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {!isConnected && (
          <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
            <AlertCircle className="w-3 h-3" />
            Connexion en cours...
          </div>
        )}
      </div>
    </div>
  );
}
