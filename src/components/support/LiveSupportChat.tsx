/**
 * LiveSupportChat.tsx
 * Chat en temps réel avec un agent support humain
 * Utilise Supabase Realtime pour la messagerie instantanée
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, User, Headphones, AlertCircle, CheckCheck, Ticket, CheckCircle, Paperclip, Image as ImageIcon, FileText, X } from 'lucide-react';
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
  attachment_url?: string;
  attachment_type?: string;
}

interface LiveSupportChatProps {
  onClose?: () => void;
  className?: string;
}

export function LiveSupportChat({ onClose, className }: LiveSupportChatProps) {
  const { user, firstName, lastName, agence } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionNotified, setSessionNotified] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [agentConnected, setAgentConnected] = useState(false);
  const [waitingForAgent, setWaitingForAgent] = useState(true);
  const [sessionClosed, setSessionClosed] = useState<'closed' | 'converted' | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; type: string } | null>(null);

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
          // Gérer les différents status de fermeture
          if (session.status === 'closed') {
            setSessionClosed('closed');
          } else if (session.status === 'converted') {
            setSessionClosed('converted');
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
        .select('id, agent_id, notified_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (existingSession) {
        setSessionId(existingSession.id);
        setSessionNotified(!!(existingSession as any).notified_at);
        if (existingSession.agent_id) {
          setAgentConnected(true);
          setWaitingForAgent(false);
        }
        
        // Charger les messages existants
        const { data: existingMessages } = await supabase
          .from('live_support_messages')
          .select('id, content, sender_id, sender_name, is_from_support, created_at, attachment_url, attachment_type')
          .eq('session_id', existingSession.id)
          .order('created_at', { ascending: true });
        
        if (existingMessages) {
          setMessages(existingMessages as LiveMessage[]);
        }
      } else {
        // Créer une nouvelle session SANS notifier (on notifie au 1er message)
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
          setSessionNotified(false);

          // Message automatique de bienvenue
          const welcomeMessage = `Bonjour ${userName} ! Décrivez votre problème ci-dessous. Un agent du support vous répondra dans les plus brefs délais.`;
          
          const { error: welcomeError } = await supabase
            .from('live_support_messages')
            .insert({
              session_id: newSession.id,
              sender_id: 'system',
              sender_name: 'Support HelpConfort',
              content: welcomeMessage,
              is_from_support: true,
            });

          if (welcomeError) {
            logError('live-support', 'Welcome message error', welcomeError);
          }
        }
      }
    } catch (error) {
      logError('live-support', 'Session init error', error);
      toast.error('Erreur de connexion au support');
    }
  };

  // Notifier les agents support (appelé au 1er message user seulement)
  const notifySupportAgents = useCallback(async () => {
    if (!sessionId || sessionNotified) return;
    
    try {
      const appUrl = window.location.origin;
      await supabase.functions.invoke('notify-support-ticket', {
        body: {
          ticketId: sessionId,
          userName,
          lastQuestion: 'Nouvelle demande de chat en direct',
          appUrl,
          source: 'live_chat',
          agencySlug: agence,
          service: 'live_support',
        },
      });
      
      // Marquer comme notifié
      await supabase
        .from('live_support_sessions')
        .update({ notified_at: new Date().toISOString() } as any)
        .eq('id', sessionId);
      
      setSessionNotified(true);
      toast.info('Un agent va vous répondre bientôt');
    } catch (notifyError) {
      logError('live-support', 'Notify error (non-blocking)', notifyError);
    }
  }, [sessionId, sessionNotified, userName, agence]);

  const handleEndChat = async () => {
    if (!sessionId) return;

    try {
      await supabase
        .from('live_support_sessions')
        .update({ status: 'closed' })
        .eq('id', sessionId);

      toast.success('Conversation terminée');
      onClose?.();
    } catch (error) {
      logError('live-support', 'End chat error', error);
      toast.error('Erreur lors de la fermeture');
    }
  };

  // Upload fichier
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('Fichier trop volumineux (max 10 MB)');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Type de fichier non supporté (images et PDF uniquement)');
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${sessionId}/${Date.now()}.${ext}`;
      
      const { data, error } = await supabase.storage
        .from('support-attachments')
        .upload(fileName, file, { upsert: false });

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from('support-attachments')
        .getPublicUrl(data.path);

      setPendingAttachment({
        url: publicUrl.publicUrl,
        type: file.type.startsWith('image/') ? 'image' : 'pdf',
      });
      
      toast.success('Fichier prêt à envoyer');
    } catch (error) {
      logError('live-support', 'Upload error', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !pendingAttachment) || !sessionId || isLoading) return;

    const content = input.trim();
    const attachment = pendingAttachment;
    setInput('');
    setPendingAttachment(null);
    setIsLoading(true);

    // Vérifier si c'est le premier message user (exclure messages système/support)
    const isFirstUserMessage = messages.filter(m => !m.is_from_support && m.sender_id !== 'system').length === 0;

    try {
      const { error } = await supabase
        .from('live_support_messages')
        .insert({
          session_id: sessionId,
          sender_id: user?.id || '',
          sender_name: userName,
          content: content || (attachment ? 'Pièce jointe' : ''),
          is_from_support: false,
          attachment_url: attachment?.url || null,
          attachment_type: attachment?.type || null,
        } as any);

      if (error) throw error;

      // Notifier le support au premier message user
      if (isFirstUserMessage) {
        await notifySupportAgents();
      }
    } catch (error) {
      logError('live-support', 'Send message error', error);
      toast.error('Erreur lors de l\'envoi');
      setInput(content);
      setPendingAttachment(attachment);
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
              En attente...
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
                  {msg.attachment_url && (
                    <div className="mb-2">
                      {msg.attachment_type === 'image' ? (
                        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                          <img 
                            src={msg.attachment_url} 
                            alt="Pièce jointe" 
                            className="max-w-[200px] max-h-[150px] rounded-md object-cover cursor-pointer hover:opacity-80"
                          />
                        </a>
                      ) : (
                        <a 
                          href={msg.attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={cn(
                            "flex items-center gap-2 px-2 py-1 rounded",
                            msg.is_from_support ? "bg-background/50 text-foreground" : "bg-white/20 text-white"
                          )}
                        >
                          <FileText className="w-4 h-4" />
                          <span className="text-xs underline">Voir le PDF</span>
                        </a>
                      )}
                    </div>
                  )}
                  {msg.content && msg.content !== 'Pièce jointe' && msg.content}
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

      {/* Zone de saisie ou message de fermeture */}
      {sessionClosed ? (
        <div className="p-4 border-t bg-muted/50">
          <div className="flex flex-col items-center gap-3 py-4">
            {sessionClosed === 'converted' ? (
              <>
                <div className="w-12 h-12 rounded-full bg-helpconfort-blue/10 flex items-center justify-center">
                  <Ticket className="w-6 h-6 text-helpconfort-blue" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Conversation convertie en ticket</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Votre demande a été enregistrée. Vous recevrez une notification lors de sa résolution.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Conversation terminée</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cette session de chat a été clôturée.
                  </p>
                </div>
              </>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClose}
              className="mt-2"
            >
              Fermer
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t space-y-2">
          {/* Aperçu pièce jointe en attente */}
          {pendingAttachment && (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              {pendingAttachment.type === 'image' ? (
                <ImageIcon className="w-4 h-4 text-helpconfort-blue" />
              ) : (
                <FileText className="w-4 h-4 text-helpconfort-blue" />
              )}
              <span className="text-xs text-muted-foreground flex-1 truncate">
                Fichier prêt à envoyer
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setPendingAttachment(null)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            {/* Input fichier caché */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {/* Bouton pièce jointe */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="shrink-0"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </Button>

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
              disabled={(!input.trim() && !pendingAttachment) || isLoading}
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
      )}
    </div>
  );
}
