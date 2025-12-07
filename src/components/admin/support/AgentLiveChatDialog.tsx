/**
 * AgentLiveChatDialog - Dialog de chat pour les agents support
 * Permet aux agents de répondre aux demandes de chat en direct
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, User, Headphones, X, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LiveCloseSessionDialog } from './LiveCloseSessionDialog';

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
}

interface AgentLiveChatDialogProps {
  session: LiveSession | null;
  onClose: () => void;
}

export function AgentLiveChatDialog({ session, onClose }: AgentLiveChatDialogProps) {
  const { user, firstName, lastName } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  const agentName = `${firstName || ''} ${lastName || ''}`.trim() || 'Agent Support';

  // Charger les messages existants
  useEffect(() => {
    if (!session?.id) return;

    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('live_support_messages')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();

    // Écouter les nouveaux messages
    const channel = supabase
      .channel(`agent-chat-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_support_messages',
          filter: `session_id=eq.${session.id}`,
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  // Scroll automatique
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !session?.id || !user?.id || isSending) return;

    const content = input.trim();
    setInput('');
    setIsSending(true);

    try {
      const { error } = await supabase
        .from('live_support_messages')
        .insert({
          session_id: session.id,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!session) return null;

  return (
    <>
      <Dialog open={!!session} onOpenChange={(open) => !open && onClose()}>
        <DialogContent 
          className="sm:max-w-2xl h-[80vh] p-0 flex flex-col"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-green-500" />
                Chat avec {session.user_name || 'Utilisateur'}
                {session.agency_slug && (
                  <Badge variant="outline" className="ml-2">
                    {session.agency_slug}
                  </Badge>
                )}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500">
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Connecté
                </Badge>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowCloseDialog(true)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Fermer
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
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
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrivez votre réponse..."
                disabled={isSending}
                className="flex-1"
              />
              <Button 
                onClick={handleSend} 
                disabled={!input.trim() || isSending}
                className="bg-helpconfort-blue hover:bg-helpconfort-blue/90"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de fermeture avec choix */}
      <LiveCloseSessionDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        sessionId={session.id}
        userId={session.user_id}
        userName={session.user_name || 'Utilisateur'}
        agencySlug={session.agency_slug}
        messages={messages}
        onClosed={onClose}
      />
    </>
  );
}
